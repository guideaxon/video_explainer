# Third-party notices

Libraries whose code is copied into files this repo delivers. Rendered videos contain no code and need no notice; the
self-contained HTML pages (`scene.html` from `scripts/three_core_build_html.mjs`) bundle the code below and keep each
library's own licence header, which the build checks.

| Library | Version | Licence | Used by |
|---|---|---|---|
| three.js | 0.180.0 (official npm release, unmodified) | MIT | `three-core`, `scene3d`, `lowpoly` |
| postprocessing | 6.38.2 | Zlib | `scene3d` post chain |
| @react-three/fiber | 8.18.0 | MIT | `lowpoly` (video only) |
| @remotion/three | 4.0.242 | MIT (package field; Remotion itself has its own licence) | `lowpoly` (video only) |

## three.js

```
The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## postprocessing

Copyright © 2015-2025 Raoul van Rüschen. Licensed under the zlib License; the full text ships with the package
(`remotion/node_modules/postprocessing/LICENSE.md`) and its header is kept in every bundled build.
