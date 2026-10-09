# YeahTube design direction

Brief: a niche, functional modern media site with distinctive typography and smooth Framer Motion interactions.

Reading: a modern personal video platform for watching and collecting, with a cool slate interface and immersive playback. ENERGY 2 / RHYTHM 2 / MOTION 2.

- Cool midnight blue and ice neutrals keep photographs and video thumbnails as the main visual content; both light and dark themes remain available.
- Clear blue marks the brand, primary action, and selected state; video-driven light remains separate from interface colors.
- Manrope gives the wordmark and page titles a compact editorial voice; DM Sans keeps titles, metadata, and controls readable at practical sizes.
- A compact feed heading leaves more space for media, followed by direct media tabs and a compact filter toolbar so choosing something to watch is the central task.
- Media tiles have no enclosing panel or shadow: the thumbnail, title, author, and viewing metadata form one readable unit.
- Small corner radii distinguish controls from imagery without making every element a capsule.
- Existing Lucide icons stay only where they identify actual actions or content types, at a consistent stroke weight.
- Framer Motion moves selection indicators and opens menus; a short content transition explains grid/list changes. Cards stay in place while browsing.
- Motion respects the operating system's reduced-motion preference; focus indicators and touch targets remain visible in both themes.
- Ambient lighting uses a blurred 64 × 36 rendering of actual video frames, blended over time at up to eight updates per second; it adds immersion without inventing colors or competing with controls.
- Lighting can be switched off in player settings and is disabled for reduced motion, embeds, fullscreen, and picture-in-picture. Sampling stops on pause, in hidden tabs, and when the player is offscreen.
- All counts, tags, authors, media, and links come from existing application data and routes.
