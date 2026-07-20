/**
 * Lightweight SVG optimization — pure string transforms, unit-tested:
 * strips comments, metadata/title/desc blocks, editor namespaces, and
 * collapses inter-tag whitespace. Never touches path data.
 */
export function optimizeSvg(source: string): string {
  return (
    source
      // XML prolog and doctype add nothing in inline/browser use.
      .replace(/<\?xml[^?]*\?>\s*/g, "")
      .replace(/<!DOCTYPE[^>]*>\s*/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
      .replace(/<title[\s\S]*?<\/title>/gi, "")
      .replace(/<desc[\s\S]*?<\/desc>/gi, "")
      // Editor cruft: Inkscape/Sodipodi/Sketch attributes and namespaces.
      .replace(/\s+(?:inkscape|sodipodi|sketch):[a-zA-Z-]+="[^"]*"/g, "")
      .replace(/\s+xmlns:(?:inkscape|sodipodi|sketch)="[^"]*"/g, "")
      .replace(/>\s+</g, "><")
      .trim()
  );
}
