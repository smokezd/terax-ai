use serde::Serialize;

const MAX_FAMILY_CHARS: usize = 128;
const MAX_FAMILIES: usize = 8;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FontFaceFile {
    pub path: String,
    pub weight: u16,
    pub italic: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FamilyFaces {
    pub family: String,
    pub faces: Vec<FontFaceFile>,
}

/// One face found on disk, reduced to what family matching needs.
#[derive(Debug, Clone)]
pub struct InstalledFace {
    pub families: Vec<String>,
    pub path: String,
    /// Face index inside a `.ttc`/`.otc` collection; 0 for single-face files.
    pub index: u32,
    pub weight: u16,
    pub italic: bool,
}

pub fn validate_family(family: &str) -> Result<&str, String> {
    let family = family.trim();
    if family.is_empty() {
        return Err("font family is empty".into());
    }
    if family.chars().count() > MAX_FAMILY_CHARS {
        return Err("font family is too long".into());
    }
    if family.chars().any(char::is_control) {
        return Err("font family contains control characters".into());
    }
    Ok(family)
}

/// Faces of `family` (case-insensitive), lightest first, one per file.
///
/// Collection faces past index 0 are dropped: a CSS `FontFace` loaded from a
/// URL always reads the first face of a collection, so registering a later
/// face would render the wrong one.
pub fn match_family(faces: &[InstalledFace], family: &str) -> Vec<FontFaceFile> {
    let mut matched: Vec<FontFaceFile> = faces
        .iter()
        .filter(|face| face.index == 0)
        .filter(|face| face.families.iter().any(|f| f.eq_ignore_ascii_case(family)))
        .map(|face| FontFaceFile {
            path: face.path.clone(),
            weight: face.weight,
            italic: face.italic,
        })
        .collect();
    matched.sort_by(|a, b| (a.weight, a.italic, &a.path).cmp(&(b.weight, b.italic, &b.path)));
    matched.dedup_by(|a, b| a.path == b.path);
    matched
}

/// User-installed font directories. WKWebView only exposes fonts shipped with
/// macOS to page content, so these are the faces the webview cannot see.
#[cfg(target_os = "macos")]
fn installed_faces() -> Vec<InstalledFace> {
    let mut db = fontdb::Database::new();
    if let Some(home) = dirs::home_dir() {
        db.load_fonts_dir(home.join("Library/Fonts"));
    }
    db.load_fonts_dir("/Library/Fonts");
    db.faces()
        .filter_map(|face| {
            let fontdb::Source::File(path) = &face.source else {
                return None;
            };
            Some(InstalledFace {
                families: face.families.iter().map(|(name, _)| name.clone()).collect(),
                path: path.to_str()?.to_owned(),
                index: face.index,
                weight: face.weight.0,
                italic: face.style != fontdb::Style::Normal,
            })
        })
        .collect()
}

/// Font files for installed families the webview cannot load by name, in
/// request order. Empty off macOS, where the webview already sees installed
/// fonts. One directory scan serves every family in the call.
#[tauri::command]
pub async fn fonts_installed_families(families: Vec<String>) -> Result<Vec<FamilyFaces>, String> {
    if families.len() > MAX_FAMILIES {
        return Err(format!("at most {MAX_FAMILIES} font families per lookup"));
    }
    let families = families
        .iter()
        .map(|family| validate_family(family).map(str::to_owned))
        .collect::<Result<Vec<_>, _>>()?;
    #[cfg(not(target_os = "macos"))]
    {
        Ok(families
            .into_iter()
            .map(|family| FamilyFaces {
                family,
                faces: Vec::new(),
            })
            .collect())
    }
    #[cfg(target_os = "macos")]
    {
        tauri::async_runtime::spawn_blocking(move || {
            let installed = installed_faces();
            families
                .into_iter()
                .map(|family| FamilyFaces {
                    faces: match_family(&installed, &family),
                    family,
                })
                .collect()
        })
        .await
        .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn face(family: &str, path: &str, index: u32, weight: u16, italic: bool) -> InstalledFace {
        InstalledFace {
            families: vec![family.into()],
            path: path.into(),
            index,
            weight,
            italic,
        }
    }

    #[test]
    fn matches_family_case_insensitively_and_orders_by_weight() {
        let faces = [
            face("Mono NF", "/f/Bold.ttf", 0, 700, false),
            face("Other", "/f/Other.ttf", 0, 400, false),
            face("mono nf", "/f/Italic.ttf", 0, 400, true),
            face("Mono NF", "/f/Regular.ttf", 0, 400, false),
        ];
        let paths: Vec<_> = match_family(&faces, "MONO NF")
            .into_iter()
            .map(|f| f.path)
            .collect();
        assert_eq!(paths, ["/f/Regular.ttf", "/f/Italic.ttf", "/f/Bold.ttf"]);
    }

    #[test]
    fn matches_any_listed_family_name() {
        let mut aliased = face("Typographic", "/f/a.ttf", 0, 400, false);
        aliased.families.push("Legacy".into());
        assert_eq!(match_family(&[aliased], "Legacy").len(), 1);
    }

    #[test]
    fn skips_later_collection_faces_and_duplicate_paths() {
        let faces = [
            face("Mono", "/f/set.ttc", 0, 400, false),
            face("Mono", "/f/set.ttc", 1, 700, false),
            face("Mono", "/f/dup.ttf", 0, 400, false),
            face("Mono", "/f/dup.ttf", 0, 400, false),
        ];
        let paths: Vec<_> = match_family(&faces, "Mono")
            .into_iter()
            .map(|f| f.path)
            .collect();
        assert_eq!(paths, ["/f/dup.ttf", "/f/set.ttc"]);
    }

    #[test]
    fn unknown_family_matches_nothing() {
        let faces = [face("Mono", "/f/a.ttf", 0, 400, false)];
        assert!(match_family(&faces, "Missing").is_empty());
    }

    #[test]
    fn validates_family_names() {
        assert_eq!(validate_family("  Mono NF  "), Ok("Mono NF"));
        assert!(validate_family("   ").is_err());
        assert!(validate_family("a\nb").is_err());
        assert!(validate_family(&"x".repeat(MAX_FAMILY_CHARS + 1)).is_err());
        assert!(validate_family(&"x".repeat(MAX_FAMILY_CHARS)).is_ok());
    }
}
