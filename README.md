# Rev.js

A highly opionionated, lightweight, frontend only solution.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
  - [Current](#current)
  - [Planned/Unplanned](#plannedunplanned)
  - [Won't Do](#wont-do)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

### Current

- Filesystem Based Router
- Slugs (dynamic data based routing)
- Components
- Inline JavaScript

### Planned/Unplanned

- Template
- Static Site Building
- Component Props (think react but less bad)
- Documentation(?)

### Won't Do

I will not specifically support non-Bun JavaScript runtimes. Bun has support for Windows, Mac, and Linux, and is faster than node/npm, yarn, or pnpm.

If you don't want Bun, you don't want this package.

## Usage

First, you can install the package like so:

```bash
bun install @tehcn/rev.js
```

Next, make sure you have this directory structure:

```directory
| index.ts
| pages/
|   _page.html
|   _layout.html
|   404.html
| public/
|   (public files such 
|        as a favicon.ico)
```

You can also have a components directory at the root level:

```directory
| index.ts
| pages/
|   _page.html
|   _layout.html
|   404.html
| components/
|   SomeComponent.html
| public/
|   (public files such 
|        as a favicon.ico)
```

In your `index.ts` file, all you need is:

```ts
import Rev from "@tehcn/rev.js";

new Rev({
 port: 8080,
 showDebug: false, // debug info isn't too important most of the time
 rootDir: __dirname, // im working to fix this, but no promises
});
```

In your `pages/_layout.html` file, is your (you guessed it) main layout. Any `pages/**/_page.html` will go in `Outlet` built-in component.

Here's the absolute *bare minimum* `pages/_layout.html`:

```ts
{{ %Outlet% }}
```

Of course, this might not look very nice, but it will work.

However, if you do want the basics, here's a more "complete" example:

```html
<!doctype html>
<html lang="en">
 <head>
  <!-- this is a component (very useful for sharing heads between pages) -->
  {{ %Head% }}
 </head>
 <body>
  <header>
   <h1>Header</h1>
  </header>
  <!-- this is a built-in component -->
  <main>{{ %Outlet% }}</main>
  <footer>Footer</footer>
 </body>
</html>
```

The `Head` component is **not** built-in. But its not very hard to implement:

In `components/Head.html`:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Title</title>
```

## Contributing

This repository is not currently accepting contributions.

## License

[MIT](./LICENSE)
