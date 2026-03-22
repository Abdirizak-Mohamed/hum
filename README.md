# 🐝 Hum

**Fully automated social media marketing for restaurants and takeaways.**

Most independent restaurants know they need a social media presence but don't have the time, skill, or budget to maintain one. Hiring a social media manager costs hundreds per month. Doing it yourself means late nights wrestling with Canva after a 12-hour shift. The result: inconsistent posting, generic content, and missed revenue.

Hum fixes this. A restaurant signs up, shares their menu, and Hum takes over — generating professional food photography, writing platform-specific captions in the restaurant's brand voice, and posting to Instagram, Facebook, and Google Business on a strategic schedule. Every week, automatically, with zero effort from the owner. 🚀

## ⚡ How It Works

### 1. 🎯 Onboard in minutes, not weeks

A new client provides their menu and basic business info. Hum's AI analyses the menu, generates a complete brand profile (voice, selling points, target audience, hashtags, content themes), and connects their social accounts. The entire process is automated — no back-and-forth with a designer, no brand questionnaires, no waiting.

### 2. 🧠 AI generates a week of content

Every week, Hum plans a content calendar tailored to the client: which dishes to feature, what themes to hit, which platforms to target. It then generates professional food images via AI, writes captions adapted to each platform's style (aspirational for Instagram, community-driven for Facebook, keyword-rich for Google), and assembles everything into ready-to-post content.

### 3. 📅 Posts go out at optimal times

Content is scheduled via Ayrshare at the best times for each platform, based on the client's audience. Failed posts are retried automatically. The operator dashboard shows exactly what's going out, what worked, and what needs attention.

### 4. 📈 Scales to hundreds of clients

The pipeline runs the same way for 1 client or 500. Once a client is onboarded, the marginal cost of serving them is just the API calls for image and copy generation. No human touches the content unless something goes wrong.

## 🏗️ The Platform

| Component | What it does |
|-----------|-------------|
| 🔄 **Content Engine** | Weekly DAG pipeline: plan calendar, generate images + captions in parallel, compose posts, schedule via social APIs |
| 🚪 **Onboarding** | Automated intake: menu parsing, brand profile generation, social account setup, first content batch |
| 📊 **Dashboard** | Operator command centre: fleet overview, content preview, issue handling, client management |
| 🔌 **Integrations** | Unified API layer: OpenAI (copy), fal.ai FLUX (images), Ayrshare (posting), Stripe (billing) |

## 💰 Pricing Tiers

| Tier | Posts/week | Platforms | Extras |
|------|-----------|-----------|--------|
| 🌱 **Starter** | 3 | Instagram, Facebook | Review responses |
| 🚀 **Growth** | 5 | + TikTok | + DM automation |
| 👑 **Premium** | 7 | + Google Business | + Ad management |

## 🍔 What Gets Posted

Hum generates three types of content in its first release:

- 📸 **Food hero shots** — AI-generated professional food photography from menu items, with varied angles, lighting, and styling to avoid visual repetition
- 🏷️ **Deal and offer posts** — Promotional graphics for specials, meal deals, and seasonal offers
- 📍 **Google Business updates** — Concise, keyword-rich posts to keep the Google profile active and visible in local search

Each post gets a platform-specific caption written in the restaurant's brand voice, with relevant hashtags and a call to action. ✍️

## 📋 Current Status

| Package | Status |
|---------|--------|
| Core data layer | ✅ Complete |
| Third-party integrations | ✅ Complete |
| Content generation pipeline | ✅ Complete |
| Client onboarding | 📐 Designed, implementation pending |
| Operator dashboard | 📐 Designed, implementation pending |

## 🛠️ For Developers

Architecture details, setup instructions, and package documentation are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
