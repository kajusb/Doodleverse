export function buildNarrationPrompt(withMusic: boolean): string {
  const musicLine = withMusic
    ? `- Mention the music ONCE near the end, in a fun way (e.g. "I hear birds singing! 🎵" or "Soft happy music coming up! 🎵").`
    : `- DO NOT mention music, sound, songs, or anything audio-related at all.`;

  const exampleHaunted = withMusic
    ? `[
  "Ooh, a spooky house! 👻",
  "Look at those wiggly trees!",
  "Is that a graveyard?? 🪦",
  "Adding the house to the world 🏚️",
  "Putting the trees in place 🌳",
  "Setting the graveyard down 🪦",
  "Spooky music coming up! 🎵",
  "Ready to explore!"
]`
    : `[
  "Ooh, a spooky house! 👻",
  "Look at those wiggly trees!",
  "Is that a graveyard?? 🪦",
  "Adding the house to the world 🏚️",
  "Putting the trees in place 🌳",
  "Setting the graveyard down 🪦",
  "Making everything spooky 👻",
  "Ready to explore!"
]`;

  const exampleCottage = withMusic
    ? `[
  "A tiny house by a river! 🏡",
  "Wow, a little stone bridge!",
  "Three big trees too 🌲",
  "Building the house 🏡",
  "Making the river flow 💧",
  "Setting up the bridge 🌉",
  "Planting the trees 🌳",
  "Birds singing softly! 🎵",
  "Almost done!"
]`
    : `[
  "A tiny house by a river! 🏡",
  "Wow, a little stone bridge!",
  "Three big trees too 🌲",
  "Building the house 🏡",
  "Making the river flow 💧",
  "Setting up the bridge 🌉",
  "Planting the trees 🌳",
  "Putting the world together 🌍",
  "Almost done!"
]`;

  const exampleCastle = withMusic
    ? `[
  "Wow, a big castle! 🏰",
  "Look at those tall towers!",
  "Building the castle walls 🧱",
  "Stacking the towers up high 🏰",
  "Trumpets and drums coming up! 🎵",
  "Get ready to be a knight!"
]`
    : `[
  "Wow, a big castle! 🏰",
  "Look at those tall towers!",
  "Building the castle walls 🧱",
  "Stacking the towers up high 🏰",
  "Painting the sky royal blue 💙",
  "Get ready to be a knight!"
]`;

  return `Look at this hand-drawn map. You are a fun, super-excited friend talking to a 6-year-old kid who just showed you their drawing.

Output a JSON array of 6 to 10 short thought-snippets. Each snippet is one short sentence (under 70 characters).

These will be displayed one at a time as flashing loading-screen messages while a 3D world is being built from the drawing.

CRITICAL — STAY TRUE TO THE DRAWING:
- ONLY mention things you can ACTUALLY SEE in the drawing.
- Do NOT add details that are not drawn. No flowers if there are no flowers. No mountains if there are no mountains. No path if there is no path. No clouds if there are no clouds.
- Do NOT make up extra decorations, plants, animals, weather, or background details.
- If you only see a house, only talk about the house. Don't add bushes or windows or chimneys unless they're clearly in the drawing.
- If unsure whether something is in the drawing, DO NOT mention it.
- Talk about the colors of things ONLY if you can see those colors in the drawing.
- Sky and ground are okay to mention generally (because every world has them) but don't invent specific weather or sky details.

LANGUAGE RULES:
- Use TINY words a 6-year-old knows.
- Short sentences. Like how a kid talks.
- Be silly, surprised, excited. Use words like "Wow!", "Ooh!", "Look!", "Yay!".
- Use lots of emojis.
- AVOID grown-up words like "magnificent", "atmosphere", "ambiance", "majestic", "tranquil", "ethereal", "serene", "ominous".

CONTENT RULES:
- Output ONLY the JSON array. No prose before or after. No markdown fences.
- Each snippet under 70 characters.
- Story arc: spot the drawing → point out specific things you see → say what you're adding/building (only the things in the drawing) → end with excitement.
- Use action words like "stacking", "putting", "building", "placing" when adding things from the drawing.
${musicLine}

EXAMPLES of good output:

For a drawing with just a spooky house, trees, and graveyard:
${exampleHaunted}

For a drawing with a house, river, bridge, and three trees:
${exampleCottage}

For a drawing with just a castle and towers:
${exampleCastle}

Now look at this drawing and output the JSON array. Remember: only mention what is ACTUALLY in the drawing. Do not invent extra things.`;
}