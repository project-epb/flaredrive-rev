<div align="center">

![Logo](https://github.com/user-attachments/assets/e02724d9-58e9-431f-bb63-d4b52c6bb7d4)

# FlareDrive: REMASTERED

</div>

> [!NOTE]
> Original project: [longern/FlareDrive](https://github.com/longern/FlareDrive)
>
> This is a totally rewritten version of FlareDrive by @dragon-fish

CloudFlare R2 storage manager with Pages and Workers. Free 10 GB storage. Free serverless backend with a limit of 100,000 invocation requests per day. [More about pricing](https://developers.cloudflare.com/r2/platform/pricing/)

## Features

![](https://github.com/user-attachments/assets/7a89b857-c11d-4c1e-bb5b-2f12d95896d3)

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

## Screenshots

**Gallery Layout**

![QQ_1747302528717](https://github.com/user-attachments/assets/a815f682-fac4-459b-b53a-9c219966be3d)

**Book Layout**

![QQ_1747302498493](https://github.com/user-attachments/assets/27135561-6ab7-40fd-8bae-3cb833f74c4c)

**Manga!**

![QQ_1747302650885](https://github.com/user-attachments/assets/bcb31353-7709-4152-b6a9-8297e300a387)

**File Info**

![QQ_1747303164282](https://github.com/user-attachments/assets/f8e5c6ab-7d16-48f3-972c-49ef109549b8)
