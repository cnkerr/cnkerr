from pathlib import Path

DATA = Path("data.js")
INDEX = Path("index.html")

data = DATA.read_text()
index = INDEX.read_text()

if "\n    editing: [" not in data:
    anchor = "    ],\n\n    factChecking: [{"
    addition = '''    ],

    editing: [
        {
            title: "Skaters Recommend Their Favorite Skate Pants",
            author: "Jenkem Staff",
            publication: "Jenkem Magazine",
            date: "August 2020",
            year: 2020,
            url: "https://www.jenkemmag.com/home/2020/08/25/skate-pants-recommendations-pros-friends/"
        },
        {
            title: "How a Group of Women Fought for Equal Pay in Contest Skating",
            author: "Ian Browning",
            publication: "Jenkem Magazine",
            date: "January 2020",
            year: 2020,
            url: "https://www.jenkemmag.com/home/2020/01/08/group-women-fought-equal-pay-contest-skating/"
        },
        {
            title: "Can Skateboarding Be a Religion? A Sociological Perspective",
            author: "Paul O’Connor",
            publication: "Jenkem Magazine",
            date: "December 2019",
            year: 2019,
            url: "https://www.jenkemmag.com/home/2019/12/18/can-skateboarding-religion-sociological-perspective/"
        },
        {
            title: "How a Sexual Predator Infiltrated Atlanta’s Skate Scene",
            author: "Andrew Murrell",
            publication: "Jenkem Magazine",
            date: "November 2019",
            year: 2019,
            url: "https://www.jenkemmag.com/home/2019/11/05/sexual-predator-infiltrated-atlantas-skate-scene/"
        },
        {
            title: "A Day in the Life of a Skate Shop",
            author: "Ian Browning",
            publication: "Jenkem Magazine",
            date: "June 2019",
            year: 2019,
            url: "https://www.jenkemmag.com/home/2019/06/11/day-life-skate-shop/"
        },
        {
            title: "Remembering the Mall Rat Shoe: The Etnies Callicut",
            author: "Nic Dobija-Nootens",
            publication: "Jenkem Magazine",
            date: "November 2018",
            year: 2018,
            url: "https://www.jenkemmag.com/home/2018/11/20/remembering-mall-rat-shoe-etnies-callicut/"
        },
        {
            title: "How Worried Should Skaters Be About CTE?",
            author: "Andrew Murrell",
            publication: "Jenkem Magazine",
            date: "August 2018",
            year: 2018,
            url: "https://www.jenkemmag.com/home/2018/08/28/skateboarders-worried-cte/"
        },
        {
            title: "What Happened to Gershon Mosley?",
            author: "Tobias Coughlin-Bogue",
            publication: "Jenkem Magazine",
            date: "August 2018",
            year: 2018,
            url: "https://www.jenkemmag.com/home/2018/08/14/happened-gershon-mosley/"
        },
        {
            title: "How Do Professional Skaters Deal With Health Insurance?",
            author: "Ian Browning",
            publication: "Jenkem Magazine",
            date: "June 2017",
            year: 2017,
            url: "https://www.jenkemmag.com/home/2017/06/23/affordable-care-acts-effect-skateboard-industry/"
        },
        {
            title: "A Day With Chaz Ortiz",
            author: "Kyle Beachy",
            publication: "Jenkem Magazine",
            date: "April 2017",
            year: 2017,
            url: "https://www.jenkemmag.com/home/2017/04/11/day-chaz-ortiz/"
        },
        {
            title: "The Skateboarder’s Guide to Getting Arrested",
            author: "Anthony Pappalardo & Colin Commito",
            publication: "Jenkem Magazine",
            date: "December 2016",
            year: 2016,
            url: "https://www.jenkemmag.com/home/2016/12/19/the-skateboarders-guide-to-getting-arrested/"
        },
        {
            title: "A Brief Look at Skateboarding’s Gay Past",
            author: "Max Dubler",
            publication: "Jenkem Magazine",
            date: "September 2016",
            year: 2016,
            url: "https://www.jenkemmag.com/home/2016/09/29/a-brief-look-at-skateboardings-gay-past/"
        },
        {
            title: "The Politics of Skate Photography",
            author: "Nic Dobija-Nootens",
            publication: "Jenkem Magazine",
            date: "July 2016",
            year: 2016,
            url: "https://www.jenkemmag.com/home/2016/07/11/the-politics-of-skate-photography/"
        }
    ],

    development: [
        {
            title: "Lurking With Lou",
            role: "Producer",
            publication: "Village Psychic",
            date: "November 2022–April 2025",
            year: 2025,
            url: "https://www.villagepsychic.net/blog/lurking-with-lou-aaron-herrington-part-1"
        },
        {
            title: "Date a Skater",
            role: "Producer & Series Development",
            publication: "Jenkem Magazine",
            date: "November 2017–March 2022",
            year: 2022,
            url: "https://www.jenkemmag.com/home/2017/11/13/introducing-date-sk8r/"
        },
        {
            title: "Jenkem Vol. 2",
            role: "Editor & Book Production",
            publication: "Jenkem Magazine",
            date: "May 2018",
            year: 2018,
            url: "https://www.jenkemmag.com/home/2018/04/03/introducing-jenkem-vol-2/"
        },
        {
            title: "Jenkem Vol. 1",
            role: "Editor & Book Production",
            publication: "Jenkem Magazine",
            date: "August 2016",
            year: 2016,
            url: "https://www.jenkemmag.com/home/2016/07/18/introducing-jenkem-vol-1/"
        }
    ],

    factChecking: [{'''
    if anchor not in data:
        raise RuntimeError("data.js insertion anchor not found")
    data = data.replace(anchor, addition, 1)

html_anchor = '''            <div class="items" id="items-research" aria-live="polite"></div>

            <div class="spacer"></div>

            <h2>FACT-CHECKING</h2>'''
html_replacement = '''            <div class="items" id="items-research" aria-live="polite"></div>

            <div class="spacer"></div>

            <h2>EDITING</h2>
            <div class="rule"></div>
            <div class="items" id="items-editing" aria-live="polite"></div>

            <div class="spacer"></div>

            <h2>DEVELOPMENT &amp; PRODUCTION</h2>
            <div class="rule"></div>
            <div class="items" id="items-development" aria-live="polite"></div>

            <div class="spacer"></div>

            <h2>FACT-CHECKING</h2>'''
if 'id="items-editing"' not in index:
    if html_anchor not in index:
        raise RuntimeError("index.html section anchor not found")
    index = index.replace(html_anchor, html_replacement, 1)

fallback_old = ': { slides:[], writing:[], research:[], factChecking:[], timeQuotes:[], notes:[], aboutSlides: [] };'
fallback_new = ': { slides:[], writing:[], research:[], editing:[], development:[], factChecking:[], timeQuotes:[], notes:[], aboutSlides: [] };'
if fallback_old in index:
    index = index.replace(fallback_old, fallback_new, 1)

ensure_old = '''    ensureArrayKey(DATA, "research");
    ensureArrayKey(DATA, "factChecking");'''
ensure_new = '''    ensureArrayKey(DATA, "research");
    ensureArrayKey(DATA, "editing");
    ensureArrayKey(DATA, "development");
    ensureArrayKey(DATA, "factChecking");'''
if 'ensureArrayKey(DATA, "editing")' not in index:
    if ensure_old not in index:
        raise RuntimeError("index.html ensureArrayKey anchor not found")
    index = index.replace(ensure_old, ensure_new, 1)

render_anchor = '''      // factChecking
      var htmlF = [];'''
render_addition = '''      if (section === "editing"){
        var htmlE = [];
        for (var e=0;e<items.length;e++){
          var itE = items[e] || {};
          var titleE = esc(normDashText(itE.title || ""));
          var hrefE = itE.url ? String(itE.url) : "";
          var titleHtmlE = hrefE
            ? ('<a href="' + esc(hrefE) + '" target="_blank" rel="noopener">' + titleE + '</a>')
            : titleE;

          var authorE = esc(itE.author || "");
          var pubE = itE.publication ? ("<em>" + esc(itE.publication) + "</em>") : "";
          var apE = (authorE && pubE) ? (authorE + " (" + pubE + ")") : (authorE || (pubE ? ("(" + pubE + ")") : ""));
          var dateE = esc(itE.date || "");
          var metaHtmlE = [apE, dateE].filter(Boolean).join(" / ");
          htmlE.push(row1(titleHtmlE, metaHtmlE));
        }
        out.innerHTML = htmlE.join("");
        return;
      }

      if (section === "development"){
        var htmlD = [];
        for (var d=0;d<items.length;d++){
          var itD = items[d] || {};
          var titleD = esc(normDashText(itD.title || ""));
          var hrefD = itD.url ? String(itD.url) : "";
          var titleHtmlD = hrefD
            ? ('<a href="' + esc(hrefD) + '" target="_blank" rel="noopener">' + titleD + '</a>')
            : titleD;

          var roleD = esc(itD.role || "");
          var pubD = itD.publication ? ("<em>" + esc(itD.publication) + "</em>") : "";
          var rpD = (roleD && pubD) ? (roleD + " (" + pubD + ")") : (roleD || (pubD ? ("(" + pubD + ")") : ""));
          var dateD = esc(itD.date || "");
          var metaHtmlD = [rpD, dateD].filter(Boolean).join(" / ");
          htmlD.push(row1(titleHtmlD, metaHtmlD));
        }
        out.innerHTML = htmlD.join("");
        return;
      }

      // factChecking
      var htmlF = [];'''
if 'section === "editing"' not in index:
    if render_anchor not in index:
        raise RuntimeError("index.html renderer anchor not found")
    index = index.replace(render_anchor, render_addition, 1)

calls_old = '''    render("writing");
    render("research");
    render("factChecking");'''
calls_new = '''    render("writing");
    render("research");
    render("editing");
    render("development");
    render("factChecking");'''
if 'render("editing")' not in index:
    if calls_old not in index:
        raise RuntimeError("index.html render call anchor not found")
    index = index.replace(calls_old, calls_new, 1)

DATA.write_text(data)
INDEX.write_text(index)
