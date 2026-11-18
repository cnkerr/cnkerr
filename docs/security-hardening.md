# cnkerr.com — static-site security notes

The site is hosted as a static GitHub Pages repository. It has no application
server or visitor accounts, so its main trust boundary is the GitHub account,
repository, and custom domain.

## Security controls in the site

- **Web URLs** from `data.js` are validated as `http:` or `https:` before
  use in links, the homepage gallery, or blog media. Other schemes are ignored.
- **About ASCII art** is reconstructed as a `<pre>` with `textContent`;
  arbitrary HTML from `data.js` is not inserted into the live DOM.
- **Embedded local HTML notes** run in a sandboxed iframe with an opaque origin.
  Scripts and user-activated new-tab links are allowed; same-origin parent
  access is not.
- **PDF previews** use a pinned PDF.js 4.2.67 ES module, with
  `isEvalSupported: false`. If PDF.js cannot load, the existing native-PDF
  iframe fallback remains available. Old asynchronous PDF errors cannot
  overwrite the next blog entry.
- **404-route restoration** accepts only origin-relative paths.

Browser and source checks are in `tests/site-hardening.spec.js` and
`tests/site-security.test.mjs`. The pull-request workflow runs source tests
and Chromium/WebKit browser tests. No deployment workflow is changed.

## Hosting controls to review manually

These settings cannot be verified or enforced from the HTML source:

1. GitHub account: passkey/security-key or other strong 2FA; recovery methods;
   authorized OAuth apps and personal access tokens.
2. Repository: branch protection/rules for `main`, required passing tests,
   least-privilege collaborators and Actions permissions.
3. GitHub Pages: enforce HTTPS and verify `cnkerr.com` as a custom domain.
4. Domain registrar: strong authentication, account recovery safeguards,
   registrar lock and renewal notifications.
5. GitHub audit/security notifications and repository secret-scanning options.

## CSP and HTTP response headers

GitHub Pages does not support arbitrary custom response headers. A
`Content-Security-Policy` meta tag offers some protection but cannot supply
`frame-ancestors` or other header-only features. This site's extensive inline
CSS/JavaScript, YouTube embeds, and PDF worker require a tested policy before
enforcement. A speculative strict CSP was intentionally **not added**, because
it could disable navigation, video, or PDF viewing.

Future improvement: separate inline JavaScript into versioned files, set a
tested restrictive CSP, and consider hosting that supports response-header
control if header-only policies are needed.

## Deployment / rollback

This work is isolated on a feature branch. **Do not merge before QA passes.**
If a regression is found after merging, revert the pull-request merge commit
or restore the preceding `index.html` version. The data file, routes, assets,
styles, and project datasets have not been modified by this patch.
