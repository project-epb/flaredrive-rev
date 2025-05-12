# FlareDrive: REMASTERED

> [!NOTE]
> Original project: [longern/FlareDrive](https://github.com/longern/FlareDrive)
>
> This is a totally rewritten version of FlareDrive by @dragon-fish

CloudFlare R2 storage manager with Pages and Workers. Free 10 GB storage. Free serverless backend with a limit of 100,000 invocation requests per day. [More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Features

- Drag-and-drop upload
- Multiple layouts: List, Grid, and Gallery
- File preview: Image, Video, Audio, PDF, and Text...
- Upload history (\* currently on local storage)

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

**Environment Variables:**

Checkout the `.env` file, default values are:

```sh
VITE_CDN_BASE_URL=/api/raw/ # CDN URL, with trailing slash
VITE_RANDOM_UPLOAD_DIR=-/ # files uploaded to this directory will be randomly named
VITE_FLARE_DRIVE_HIDDEN_KEY="_\$flaredrive\$" # used to internally hide files, like thumbnails
```

### Authentication

There is no built-in authentication support. By default everyone can read and write your storage. But CloudFlare Zero Trust can be used to protect your data. Do these steps to enable authentication:

1. Enable CloudFlare Zero Trust
2. In **Access**->**Applications**, create a self-hosted application
3. Set **Path** as `api/write/` to disable public write or leave it blank to disable public read
4. Create a policy which accepts your email only
