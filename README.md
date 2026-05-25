# Deployable

<p align="center">
  <img src="./src/assets/logo.png" alt="Deployable logo" width="300"   >
</p>

Deployable is an easy-to-deploy proxy site with over 900 games.

## Deploying

Download the zip from the [Releases](https://github.com/falling3_4/Deployable/releases) page, and upload `index.html` and `pingas.js` files.

> [!WARNING]
> If your service changes the names of files, you may need to upload the `.js` file first, then modify the service worker URL in index.ts


## Building

> [!NOTE]
> Before building, install [git](https://git-scm.com/downloads) and [node.js](https://nodejs.org/en/download/prebuilt-installer). Then, install pnpm with `npm install -g pnpm`.

1. Clone the repository:

   ```bash
   git clone https://github.com/falling3-4/Deployable.git
   cd Deployable
   ```

2. Install dependencies and build:
   ```bash
   pnpm install && pnpm build
   ```

The files should now be in the `./dist/` directory.


### Licensing
This project is licensed under the MIT License. You can view the license [here](./LICENSE). 
