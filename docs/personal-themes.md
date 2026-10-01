# Peacee1 personal themes

Five palette choices: purple `#7C3AED`, pink `#F472B6`, green `#34D399`, blue `#3B82F6`, yellow `#F59E0B`. These match the existing personalisation swatches. Accent is saved in the authenticated user's profile, validated on the server. Light/dark/system display preference is retained on the device. Financial income/expense colours remain distinct from the accent.

## Image assets and prompts

The built-in imagegen tool produced separate recoloured edits for pink, green, blue and yellow. Purple uses the original supplied artwork. Files consumed by the application live in `frontend/public/themes/{color}/{asset}.webp`. The original generated PNGs remain in the Codex generated-images directory. WebP conversion only resizes and encodes the completed artwork, preserving alpha; it does not perform recolouring.

Each colour has these assets: `cat_mascot`, `wallet_logo`, `cat_ai_mascot`, `biz_cat`, `cat_budget_mascot`, `goal_mascot`, `login_bg`, `checkin_banner`. The personal dashboard changes its mascot/illustration sources with the chosen accent. Login artwork variants are supplied for future use; the public login screen keeps its original artwork.

Final prompt template used independently for every asset and colour:

> Use case: precise-object-edit. Input is the exact edit target. Create one {COLOR} theme variant of this Peacee1 application asset. Change ONLY purple and lavender regions (including cat fur, purple props and purple backdrop where present) to {HEX} with harmonious highlights/shadows. Preserve exact character identity, pose, anatomy, eye expression, silhouette, framing, layout, white muzzle/belly, pink cheeks/paw pads, all gold coins/details, and glossy cute 3D style. No new objects or changed text. Output a single finished asset, not a collage.

Additional asset constraints:

- Plain mascot: retain golden eye stars and the original happy pose.
- Wallet: retain gold coins.
- AI mascot: preserve the laptop, exact `AI` letters, gold glasses and medallion.
- Business cat: preserve the dark suit, briefcase/charts and gold accessories.
- Budget cat: preserve the bitten gold coin and its `đ` symbol.
- Goal cat: preserve gold coins and growth arrow.
- Welcome background: preserve the `Welcome` spelling, left-side character and empty space on the right.
- Check-in banner: preserve the original transparent cutout background (including corners), wide composition and the exact Vietnamese copy: `Điểm danh mỗi ngày`, `Nhận 20 coin!`, `Duy trì thói quen tốt, quản lý chi tiêu hiệu quả hơn`, `và nhận thêm nhiều phần thưởng hấp dẫn.`
- Isolated illustrations: genuine transparent background, not a black or white backdrop. Welcome background: preserve the original opaque wide composition and recolour the backdrop harmoniously. Check-in banner: preserve its original transparent cutout.

`tools/prepare-theme-assets.cjs` accepts a JSON array of `{color,asset,source,transparent}` on stdin and a local `SHARP_MODULE` path. It verifies alpha for cutouts, resizes mascots to at most 640px/banners to 1280px and saves WebP assets plus a contact sheet. Sharp is a local artwork preparation tool, not an added application dependency.

Wallet separation: settings can require personal transactions to choose cash or account money. Existing unclassified records stay unclassified until edited; disabling the setting retains classifications. The overview splits monthly income, expense and net movement. It does not imply a verified bank balance or an opening balance.
