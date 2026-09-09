from pathlib import Path

PATH = Path("index.html")
s = PATH.read_text()

def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f"anchor not found: {label}")
    s = s.replace(old, new, 1)

# Keep all relative assets rooted at cnkerr.com even on nested clean URLs like /blog/<entry>.
replace_once(
    '<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />\n<title>Christian N. Kerr</title>',
    '<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />\n<base href="/" />\n<title>Christian N. Kerr</title>',
    "base href"
)

replace_once(
'''    <a class="nameBtn" id="linkHomeTop" href="#/home" data-route="home" title="Home" aria-label="Home">Christian N. Kerr</a>

    <div class="controls">
      <div class="btns" aria-label="Navigation">
        <a class="btn" id="linkNotes" href="#/notes" data-route="notes" title="Blog" aria-label="Blog"><div class="glyph">博</div></a>
        <a class="btn" id="linkWriting"  href="#/writing"  data-route="writing"  title="Clips"  aria-label="Clips"><div class="glyph">刊</div></a>
        <a class="btn" id="linkResearch" href="#/research" data-route="research" title="Research" aria-label="Research"><div class="glyph">研</div></a>
        <a class="btn" id="linkContact"  href="#/contact"  data-route="contact"  title="Contact"  aria-label="Contact"><div class="glyph">联</div></a>''',
'''    <a class="nameBtn" id="linkHomeTop" href="/" data-route="home" title="Home" aria-label="Home">Christian N. Kerr</a>

    <div class="controls">
      <div class="btns" aria-label="Navigation">
        <a class="btn" id="linkNotes" href="/blog" data-route="notes" title="Blog" aria-label="Blog"><div class="glyph">博</div></a>
        <a class="btn" id="linkWriting"  href="/clips"  data-route="writing"  title="Clips"  aria-label="Clips"><div class="glyph">刊</div></a>
        <a class="btn" id="linkResearch" href="/bts" data-route="research" title="Research" aria-label="Research"><div class="glyph">研</div></a>
        <a class="btn" id="linkContact"  href="/contact"  data-route="contact"  title="Contact"  aria-label="Contact"><div class="glyph">联</div></a>''',
    "navigation hrefs"
)

replace_once(
'''(function loadDataThenBoot(){
  function boot(){''',
'''(function loadDataThenBoot(){
  // GitHub Pages serves 404.html for clean deep links. That file redirects to
  // /?p=<original path>; restore the pretty path before loading data.js.
  (function restorePathFrom404(){
    try{
      var params = new URLSearchParams(location.search);
      var preserved = params.get("p");
      if (!preserved) return;
      var target = new URL(preserved, location.origin);
      history.replaceState(null, "", target.pathname + target.search + target.hash);
    }catch(_){}
  })();

  function boot(){''',
    "404 path restoration"
)

# Relative media URLs must resolve from the site root on nested /blog/<entry> URLs.
s = s.replace('new URL(src, location.href)', 'new URL(src, document.baseURI)')
s = s.replace('new URL(file, location.href)', 'new URL(file, document.baseURI)')

replace_once(
'''    function noteKeyFromHash(){
      var m = String(location.hash || "").match(/^#\\/notes\\/([^\\/?#]+)\\b/);
      return m ? decodeURIComponent(m[1]) : "";
    }''',
'''    function noteKeyFromLocation(){
      var pathMatch = String(location.pathname || "").match(/^\\/blog\\/([^\\/?#]+)\\/?$/);
      if (pathMatch) return decodeURIComponent(pathMatch[1]);

      // Backwards compatibility for old bookmarked hash URLs.
      var hashMatch = String(location.hash || "").match(/^#\\/notes\\/([^\\/?#]+)\\b/);
      return hashMatch ? decodeURIComponent(hashMatch[1]) : "";
    }''',
    "blog key routing"
)

replace_once(
'''        var href = "#/notes/" + encodeURIComponent(key);
        var ledCls = esc(ledClassForType(n));''',
'''        var href = "/blog/" + encodeURIComponent(key);
        var ledCls = esc(ledClassForType(n));''',
    "blog href"
)

replace_once(
'''              '<a class="titleCell" href="' + esc(href) + '">' + title + '</a>' +''',
'''              '<a class="titleCell" data-blog-key="' + esc(key) + '" href="' + esc(href) + '">' + title + '</a>' +''',
    "blog link marker"
)

replace_once('var key = noteKeyFromHash();', 'var key = noteKeyFromLocation();', "refresh blog key")

replace_once(
'''      suppressHashReopen = true;
      location.hash = "#/notes/" + encodeURIComponent(key);
      setTimeout(function(){
        suppressHashReopen = false;
        refreshNotes();
      }, 0);''',
'''      goToPath("/blog/" + encodeURIComponent(key));''',
    "blog prev/next navigation"
)

replace_once(
'''      var h = String(location.hash || "");
      if (h.indexOf("#/notes") !== 0) return;''',
'''      if (normalizeRouteFromLocation() !== "notes") return;''',
    "blog keyboard route check"
)

replace_once(
'''    if (blogHomeBtn){
      blogHomeBtn.addEventListener("click", function(){
        suppressHashReopen = true;
        location.hash = "#/notes";
        setTimeout(function(){
          suppressHashReopen = false;
          refreshNotes();
        }, 0);
      });
    }
    if (blogListBtn){
      blogListBtn.addEventListener("click", function(){
        if (blogListBtn.disabled) return;
        suppressHashReopen = true;
        location.hash = "#/notes";
        setTimeout(function(){
          suppressHashReopen = false;
          refreshNotes();
        }, 0);
      });
    }''',
'''    if (blogHomeBtn){
      blogHomeBtn.addEventListener("click", function(){
        goToPath("/blog");
      });
    }
    if (blogListBtn){
      blogListBtn.addEventListener("click", function(){
        if (blogListBtn.disabled) return;
        goToPath("/blog");
      });
    }''',
    "blog header navigation"
)

old_router = '''    function normalizeRoute(hash){
      var raw = String(hash || "");
      var m = raw.match(/^#\\/(home|writing|research|notes|contact)\\b/);
      return m ? m[1] : "home";
    }

    function setActive(key){
      Object.keys(panels).forEach(function(k){
        if (panels[k]) panels[k].classList.toggle("isActive", k === key);
      });
      Object.keys(links).forEach(function(k){
        if (links[k]) links[k].classList.toggle("isActive", k === key);
      });

      if (key === "home") requestAnimationFrame(panCenter);
      if (key === "notes") requestAnimationFrame(function(){
        refreshNotes();
              });
    }

    document.addEventListener("click", function(e){
      var a = e.target.closest("a[data-route]");
      if (!a) return;
      e.preventDefault();
      var key = a.dataset.route || "home";
      location.hash = "#/" + key;
    });

    // Home nameplate opens About modal on DOUBLE-CLICK
    var homeNameplate = $("linkHomeTop");
    if (homeNameplate){
      homeNameplate.addEventListener("dblclick", function(e){
        e.preventDefault();
        e.stopPropagation();
        location.hash = "#/home";
        setTimeout(openAboutDialog, 0);
      });

      // Mobile: single tap opens About when already on Home
      homeNameplate.addEventListener("click", function(e){
        if (!isCoarsePointer()) return;
        var r = normalizeRoute(location.hash);
        if (r !== "home") return;
        e.preventDefault();
        e.stopPropagation();
        setTimeout(openAboutDialog, 0);
      });
    }

    window.addEventListener("hashchange", function(){
      var r = normalizeRoute(location.hash);
      setActive(r);
      if (r === "notes"){
        refreshNotes();
              }
    });'''

new_router = '''    var routePaths = {
      home: "/",
      writing: "/clips",
      research: "/bts",
      notes: "/blog",
      contact: "/contact"
    };

    function pathForRoute(key){
      return routePaths[key] || "/";
    }

    function normalizeRouteFromLocation(){
      var path = String(location.pathname || "/").replace(/\\/+$/, "") || "/";
      if (path === "/clips") return "writing";
      if (path === "/bts") return "research";
      if (path === "/contact") return "contact";
      if (path === "/blog" || path.indexOf("/blog/") === 0) return "notes";
      return "home";
    }

    function legacyPathFromHash(hash){
      var raw = String(hash || "");
      var entry = raw.match(/^#\\/notes\\/([^\\/?#]+)\\b/);
      if (entry) return "/blog/" + entry[1];

      var m = raw.match(/^#\\/(home|writing|research|notes|contact)\\b/);
      if (!m) return "";
      return pathForRoute(m[1]);
    }

    function migrateLegacyLocation(){
      var legacy = legacyPathFromHash(location.hash);
      if (legacy){
        history.replaceState(null, "", legacy);
        return;
      }

      var path = String(location.pathname || "/").replace(/\\/+$/, "") || "/";
      var aliases = {
        "/home": "/",
        "/writing": "/clips",
        "/research": "/bts",
        "/notes": "/blog"
      };
      if (aliases[path]) history.replaceState(null, "", aliases[path]);
    }

    function setActive(key){
      Object.keys(panels).forEach(function(k){
        if (panels[k]) panels[k].classList.toggle("isActive", k === key);
      });
      Object.keys(links).forEach(function(k){
        if (links[k]) links[k].classList.toggle("isActive", k === key);
      });

      if (key === "home") requestAnimationFrame(panCenter);
      if (key === "notes") requestAnimationFrame(function(){
        refreshNotes();
              });
    }

    function goToPath(path, replace){
      var target = String(path || "/");
      var current = location.pathname + location.search;
      if (replace) history.replaceState(null, "", target);
      else if (current !== target) history.pushState(null, "", target);
      setActive(normalizeRouteFromLocation());
    }

    document.addEventListener("click", function(e){
      var blogLink = e.target.closest("a[data-blog-key]");
      if (blogLink){
        e.preventDefault();
        goToPath(blogLink.getAttribute("href") || "/blog");
        return;
      }

      var a = e.target.closest("a[data-route]");
      if (!a) return;
      e.preventDefault();
      var key = a.dataset.route || "home";
      goToPath(pathForRoute(key));
    });

    // Home nameplate opens About modal on DOUBLE-CLICK
    var homeNameplate = $("linkHomeTop");
    if (homeNameplate){
      homeNameplate.addEventListener("dblclick", function(e){
        e.preventDefault();
        e.stopPropagation();
        goToPath("/", true);
        setTimeout(openAboutDialog, 0);
      });

      // Mobile: single tap opens About when already on Home
      homeNameplate.addEventListener("click", function(e){
        if (!isCoarsePointer()) return;
        var r = normalizeRouteFromLocation();
        if (r !== "home") return;
        e.preventDefault();
        e.stopPropagation();
        setTimeout(openAboutDialog, 0);
      });
    }

    window.addEventListener("popstate", function(){
      setActive(normalizeRouteFromLocation());
    });

    // Old #/ links remain valid and are immediately canonicalized.
    window.addEventListener("hashchange", function(){
      var legacy = legacyPathFromHash(location.hash);
      if (!legacy) return;
      history.replaceState(null, "", legacy);
      setActive(normalizeRouteFromLocation());
    });'''

replace_once(old_router, new_router, "router")

replace_once(
'''    if (!location.hash) location.hash = "#/home";
    setActive(normalizeRoute(location.hash));''',
'''    migrateLegacyLocation();
    setActive(normalizeRouteFromLocation());''',
    "router init"
)

PATH.write_text(s)
