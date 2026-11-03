---
status: draft
updated: 2026-11-02
---
# Tidying the paid-app list before the AI research run

WHY this file: Destin chose "tidy first, then run" (Nov 2). Each paid app name is also a page on the site
("Open-source alternatives to X", at `alternatives-to/<name>/`), so every change below changes what visitors see.
Renamed or removed pages send old links to the new page, so bookmarks and search results keep working.

Answer per section: **OK**, **no**, or a change. One "all OK" is fine.

## 1. Spelling: use the official name (6)

| Now | Becomes |
|---|---|
| Hubspot | HubSpot |
| MeetUp | Meetup |
| apigee | Apigee |
| NewRelic | New Relic |
| Fly | Fly.io |
| Bloomberg | Bloomberg Terminal |

What visitors see: the corrected name on its subcategory page and its own page.

## 2. One product under two names: merge (5)

| Now | Becomes | Why |
|---|---|---|
| "OpenAI Codex app" (AI coding) and "ChatGPT Codex app" (agent front-ends) | OpenAI Codex | The same product |
| "MSI Afterburner / RivaTuner" (gaming performance) | MSI Afterburner | Already listed under that name in PC tuning; RivaTuner comes bundled with it |
| "SmartThings" (smart home) | Samsung SmartThings | Already listed under that name in TV remotes |
| "Gemini" (open AI models) | Google Gemini | Already listed under that name in AI chat |
| "ChatGPT models (OpenAI)" (open AI models) | ChatGPT | Same as Claude, which is already one name in both places |

What visitors see: one page instead of two. For example, "Open-source alternatives to ChatGPT" now also lists the open
AI models people can run themselves, the way the Claude page already does.

## 3. Several products in one name: split (2)

| Now | Becomes |
|---|---|
| "Official YouTube, Reddit and Discord apps" (other ways to use big sites) | YouTube, Reddit, Discord |
| "VMware Workstation / vSphere" (virtual machines) | VMware Workstation, VMware vSphere |

What visitors see: the YouTube, Reddit and Discord pages gain the "other ways to use them" projects (e.g. NewPipe for
YouTube). The combined page goes away and sends its visitors to the YouTube page.

## 4. Not really a replaceable app: remove (1)

| Now | Why |
|---|---|
| AWS VPC (in VPN) | It's Amazon's private cloud networking, not a VPN app people swap for Tailscale-style tools. The list keeps Tailscale and OpenVPN Access Server |

What visitors see: AWS VPC leaves the VPN page; its own page sends visitors to the VPN subcategory.

## 5. Kept as they are, but not researched (5)

Microsoft Office, Microsoft 365, Google Workspace, "Built-in smart TV software", "Vendor router firmware".
The bundles' answers would only repeat Word, Excel and PowerPoint's. The two generic names have no single maker to check.
Their pages stay (people do search "alternatives to Microsoft Office"). Nothing visitors see changes.

## 6. Possibly discontinued: let the research check, then decide (about 13)

Pocket, Picasa, Snap Camera, ComiXology, Sisu Data, Orbit, CodeSee, QnA Maker, AWS Lookout, Dyn, Microsoft Lens,
Google Assistant, DALL·E.

These may have shut down or been replaced. Rather than guess, the research run checks first whether each app still
exists, and skips the checklist for any that don't. Recommendation for those that are gone: **keep them listed with a
"Discontinued" label**, because people hunt for alternatives exactly when an app shuts down (Pocket closing sent many
people looking). Visitors would see that label on the app's page and on its subcategory page.
