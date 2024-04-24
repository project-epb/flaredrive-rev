> [!WARNING]
> This project is a **derivative work** based on [longern/FlareDrive](https://github.com/longern/FlareDrive). You should not directly fork this repository.

# FlareDrive

CloudFlare R2 storage manager with Pages and Workers. Free 10 GB storage. Free serverless backend with a limit of 100,000 invocation requests per day. [More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Features

- Drag-and-drop upload
- Upload large files
- Create folders
- Search files
- Image/video thumbnails

## Derivative features ✨

> [!NOTE]
> These features are not available in the original project. I implement them because of my needs.

- Custom `baseUrl`
  - So you can use some domain with CDN to serve files
- More sorting options
  - Sort by file size, uploaded date, and file name in both ascending and descending order
- Random uploads
  - Upload files to `/-/` folder to make the file name random. This is useful for sharing files without revealing the file name.
- Touch device improvements
  - Dot menu button for file actions
- Style improvements
  - More modern and clean design
  - Flexibility for different screen sizes. More for large screens, less for small screens.
  - Tabler icons
- Upload history
  - Keep track of the files you uploaded
- Refactor with Vue3 setup
  - More readable and maintainable code

## Usage

### Installation

Before starting, you should make sure that

- you have created a [CloudFlare](https://dash.cloudflare.com/) account
- your payment method is added
- R2 service is activated and at least one bucket is created

Steps:

1. Fork this project and connect your fork with CloudFlare Pages
2. Add a custom domain
3. Bind your R2 bucket to `BUCKET` varaible
4. Manually redeploy to make R2 bindings take effect

### Authentication

There is no built-in authentication support. By default everyone can read and write your storage. But CloudFlare Zero Trust can be used to protect your data. Do these steps to enable authentication:

1. Enable CloudFlare Zero Trust
2. In **Access**->**Applications**, create a self-hosted application
3. Set **Path** as `api/write/` to disable public write or leave it blank to disable public read
4. Create a policy which accepts your email only
