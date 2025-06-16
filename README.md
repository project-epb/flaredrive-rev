<div align="center">

![Logo](https://github.com/user-attachments/assets/e02724d9-58e9-431f-bb63-d4b52c6bb7d4)

# FlareDrive: REMASTERED

[<img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare">](https://deploy.workers.cloudflare.com/?url=https://github.com/project-epb/flaredrive-rev)

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

FlareDrive is almost ready to use out of the box. It only takes a few simple steps to install:

1. [Click this link to start the installation](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers)
2. Paste `https://github.com/project-epb/flaredrive-rev` into the "Git repository URL" box and click Next.
3. Follow the prompts in the form to create a new project.
4. Done!

(Optional) If you want a custom domain or CDN, check the control panel of the workers and the control panel of the R2 bucket you created in the previous step.

Check out the [`.env.sample`](.env.sample) file for all the environment variables available for configuration!

**Configuration example:**

![](https://github.com/user-attachments/assets/b7a0f279-69ed-4232-a784-4845a9975cd3)

### Authentication

There is no built-in authentication support, yet. By default everyone can read and write your storage. But CloudFlare Zero Trust can be used to protect your data. Do these steps to enable authentication:

1. Enable CloudFlare Zero Trust
2. In **Access**->**Applications**, create a self-hosted application
3. Set **Path** as `api/bucket/` to disable public write or leave it blank to disable public read
4. Create a policy which accepts your email only

## Screenshots

**Gallery Layout**

![](https://github.com/user-attachments/assets/a815f682-fac4-459b-b53a-9c219966be3d)

**Book Layout**

![](https://github.com/user-attachments/assets/27135561-6ab7-40fd-8bae-3cb833f74c4c)

**Manga!**

![](https://github.com/user-attachments/assets/bcb31353-7709-4152-b6a9-8297e300a387)

**File Info**

![](https://github.com/user-attachments/assets/f8e5c6ab-7d16-48f3-972c-49ef109549b8)

---

> MIT License
>
> Copyright (c) 2022 Siyu Long<br>Copyright (c) 2025 Dragon Fish
