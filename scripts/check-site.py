"""Dependency-free preflight for the static production and review pages."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.nodes, self.ids, self.headings = path, [], [], []
        self.schema, self.in_schema, self.schema_text = [], False, ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.nodes.append((tag, attrs))
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.headings.append(int(tag[1]))
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.in_schema, self.schema_text = True, ""

    def handle_data(self, data):
        if self.in_schema:
            self.schema_text += data

    def handle_endtag(self, tag):
        if tag == "script" and self.in_schema:
            self.schema.append(json.loads(self.schema_text))
            self.in_schema = False


canonical = "https://" + (ROOT / "CNAME").read_text().strip() + "/"
for filename in ("index.html", "hero-preview/index.html"):
    page = Page(ROOT / filename)
    page.feed(page.path.read_text(encoding="utf-8"))
    assert len(page.ids) == len(set(page.ids)), f"{filename}: duplicate IDs"
    assert page.headings.count(1) == 1, f"{filename}: expected one H1"
    previous = 0
    for level in page.headings:
        assert level <= previous + 1, f"{filename}: skipped heading level"
        previous = level
    meta = {a.get("name") or a.get("property"): a.get("content")
            for tag, a in page.nodes if tag == "meta"}
    assert "Tiranë" in meta["description"]
    expected_robots = "index, follow" if filename == "index.html" else "noindex, follow"
    assert meta.get("robots") == expected_robots, f"{filename}: unexpected indexing policy"
    assert [a["href"] for tag, a in page.nodes
            if tag == "link" and a.get("rel") == "canonical"] == [canonical]
    assert len(page.schema) == 1 and page.schema[0]["url"] == canonical
    assert page.schema[0]["telephone"] == "+355692745532"
    sections = [a.get("id") for tag, a in page.nodes if tag == "section"]
    assert sections[:4] == ["hxPin", "rreth", "sherbime", "punime"], sections
    if filename == "index.html":
        assert "home" in page.ids and "galeri" in page.ids, "legacy anchors missing"
    assert "hxScroll" not in page.ids, "removed scroll prompt has returned"
    for tag, attrs in page.nodes:
        if tag == "a" and attrs.get("href", "").startswith("#"):
            assert unquote(attrs["href"][1:]) in page.ids, attrs["href"]
        if tag == "img":
            assert "alt" in attrs and attrs.get("width") and attrs.get("height"), attrs
        resources = []
        if tag in ("img", "script", "source", "video"):
            resources += [attrs[k] for k in ("src", "poster") if attrs.get(k)]
        if tag == "image" or tag == "link" and attrs.get("rel") in ("icon", "preload", "stylesheet"):
            resources += [attrs["href"]] if attrs.get("href") else []
        if attrs.get("srcset"):
            resources += [candidate.strip().split()[0] for candidate in attrs["srcset"].split(",")]
        for resource in resources:
            parsed = urlsplit(resource)
            if not parsed.scheme and not parsed.netloc and parsed.path:
                target = (page.path.parent / unquote(parsed.path)).resolve()
                assert target.is_relative_to(ROOT) and target.is_file(), f"{filename}: missing {resource}"
    print(f"PASS {filename}: SEO, schema, headings, section order, anchors and local assets")

locations = ET.parse(ROOT / "sitemap.xml").findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
assert [node.text for node in locations] == [canonical]
robots = (ROOT / "robots.txt").read_text()
assert f"Sitemap: {canonical}sitemap.xml" in robots and "Disallow: /" not in robots
print("PASS preferred hostname, sitemap and robots.txt")
