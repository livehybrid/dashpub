# Dashboard Publisher

**EXPERIMENTAL** tool that creates a Next.js project for a given list of Splunk dashboards, optionally making the dashboards accessible to anyone using [Vercel](https://vercel.com). Search results are proxied through serverless functions, which handle authentication and efficient CDN caching.

## Prerequisites

- Node.js 18+ (Recommended)
- npm (comes with Node)
- [Vercel CLI](https://vercel.com/download) (if you want to publish on Vercel)

### Installing Node.js on macOS (Recommended)
We recommend using Homebrew to install Node.js:

```bash
brew install node
```

You can verify the installation with:

```bash
node -v
npm -v
```

## Get started

1. Clone this repository:

```bash
git clone https://github.com/livehybrid/dashpub.git
cd dashpub
```

2. Install dependencies:

```bash
npm install
```

3. Install the CLI globally:

```bash
npm install -g .
```

4. Initialize a new project:

```bash
dashpub init
```

Follow the prompts to create your dashboard project.

> Note: There is currently no `build` step required unless you add additional tooling.

---

Copyright 2020 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

