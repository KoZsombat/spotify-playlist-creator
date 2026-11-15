export type LexGroup = "genre" | "mood" | "occasion";

export type LexEntry = {
  id: string;
  label: string;
  group: LexGroup;
  /** Everything a user might type. Matched longest-first with word boundaries. */
  aliases: string[];
  /** What we actually send to Spotify search. Defaults to [label]. */
  queries?: string[];
};

const g = (
  id: string,
  label: string,
  aliases: string[],
  queries?: string[],
): LexEntry => ({ id, label, group: "genre", aliases, queries });

const m = (id: string, label: string, aliases: string[], queries?: string[]): LexEntry => ({
  id,
  label,
  group: "mood",
  aliases,
  queries,
});

const o = (id: string, label: string, aliases: string[], queries?: string[]): LexEntry => ({
  id,
  label,
  group: "occasion",
  aliases,
  queries,
});

/**
 * Ordered roughly by how often people describe music by these tags. The parser
 * claims the longest alias first, so "pop punk" wins over "pop".
 */
export const LEXICON: LexEntry[] = [
  // --- Hip hop ---
  g("hiphop", "hip hop", ["hip hop", "hiphop", "hip-hop", "rap", "rapper", "rapping"]),
  g("trap", "trap", ["trap", "trap music"], ["trap", "trap rap"]),
  g("drill", "drill", ["drill", "uk drill", "ny drill"], ["drill", "uk drill"]),
  g("boombap", "boom bap", ["boom bap", "boombap", "90s hip hop", "old school hip hop"], [
    "boom bap",
    "90s hip hop",
  ]),
  g("phonk", "phonk", ["phonk", "memphis rap", "drift phonk"], ["phonk", "drift phonk"]),
  g("grime", "grime", ["grime"], ["grime", "uk grime"]),
  g("emorap", "emo rap", ["emo rap", "sad rap", "melodic rap"], ["emo rap", "sad rap"]),

  // --- Pop ---
  g("pop", "pop", ["pop", "pop music", "top 40", "chart pop"]),
  g("synthpop", "synth pop", ["synth pop", "synthpop", "80s pop"], ["synth pop", "80s pop"]),
  g("hyperpop", "hyperpop", ["hyperpop", "hyper pop"], ["hyperpop", "glitchcore"]),
  g("dancepop", "dance pop", ["dance pop", "dancepop", "party pop"], ["dance pop"]),
  g("indiepop", "indie pop", ["indie pop", "indiepop"], ["indie pop", "bedroom pop"]),
  g("kpop", "k-pop", ["k-pop", "kpop", "korean pop"], ["k-pop", "kpop hits"]),
  g("jpop", "j-pop", ["j-pop", "jpop", "japanese pop"], ["j-pop", "japanese pop"]),
  g("citypop", "city pop", ["city pop", "citypop", "japanese city pop"], [
    "city pop",
    "japanese city pop",
  ]),
  g("afropop", "afropop", ["afropop", "afro pop", "afro-pop"], ["afropop", "afrobeats"]),

  // --- Rock & guitar ---
  g("rock", "rock", ["rock", "rock music"]),
  g("indierock", "indie rock", ["indie rock", "indie"], ["indie rock", "indie anthems"]),
  g("altrock", "alt rock", ["alt rock", "alternative rock", "alternative"], [
    "alternative rock",
    "alt rock",
  ]),
  g("poppunk", "pop punk", ["pop punk", "poppunk", "emo", "emo punk"], ["pop punk", "emo"]),
  g("punk", "punk", ["punk", "punk rock"], ["punk rock", "punk"]),
  g("grunge", "grunge", ["grunge", "90s grunge"], ["grunge", "90s grunge"]),
  g("shoegaze", "shoegaze", ["shoegaze", "shoe gaze"], ["shoegaze", "dreamy guitar"]),
  g("dreampop", "dream pop", ["dream pop", "dreampop"], ["dream pop", "ethereal pop"]),
  g("postpunk", "post punk", ["post punk", "post-punk"], ["post punk", "post-punk"]),
  g("garagerock", "garage rock", ["garage rock", "garage"], ["garage rock", "garage revival"]),
  g("psychrock", "psychedelic rock", ["psychedelic rock", "psych rock", "psychedelia"], [
    "psychedelic rock",
    "psych rock",
  ]),
  g("hardrock", "hard rock", ["hard rock", "classic rock"], ["hard rock", "classic rock"]),
  g("progrock", "prog rock", ["prog rock", "progressive rock", "prog"], ["prog rock"]),
  g("metal", "metal", ["metal", "heavy metal"], ["metal", "heavy metal"]),
  g("metalcore", "metalcore", ["metalcore", "screamo"], ["metalcore", "post-hardcore"]),
  g("numetal", "nu metal", ["nu metal", "numetal"], ["nu metal", "2000s metal"]),
  g("deathmetal", "death metal", ["death metal", "deathcore"], ["death metal", "deathcore"]),
  g("blackmetal", "black metal", ["black metal"], ["black metal", "atmospheric black metal"]),
  g("doom", "doom metal", ["doom metal", "doom", "sludge"], ["doom metal", "sludge metal"]),

  // --- Electronic ---
  g("electronic", "electronic", ["electronic", "electronica", "edm"], ["electronic", "edm"]),
  g("house", "house", ["house", "house music", "deep house", "tech house"], [
    "house music",
    "deep house",
  ]),
  g("techno", "techno", ["techno", "melodic techno"], ["techno", "melodic techno"]),
  g("trance", "trance", ["trance", "psytrance"], ["trance", "uplifting trance"]),
  g("bigroom", "big room", ["big room", "festival edm", "mainstage"], ["big room house", "festival edm"]),
  g("dubstep", "dubstep", ["dubstep", "brostep", "riddim"], ["dubstep", "riddim"]),
  g("futurebass", "future bass", ["future bass", "futurebass"], ["future bass", "melodic bass"]),
  g("dnb", "drum and bass", ["drum and bass", "drum n bass", "dnb", "d&b", "drum & bass"], [
    "drum and bass",
    "liquid dnb",
  ]),
  g("jungle", "jungle", ["jungle", "jungle dnb"], ["jungle", "breakbeat jungle"]),
  g("ukgarage", "UK garage", ["uk garage", "garage house", "2-step", "speed garage"], [
    "uk garage",
    "2-step garage",
  ]),
  g("breakcore", "breakcore", ["breakcore", "breakbeat"], ["breakcore", "breakbeat"]),
  g("ambient", "ambient", ["ambient", "ambient music", "drone"], ["ambient", "ambient music"]),
  g("downtempo", "downtempo", ["downtempo", "down tempo", "chillout"], ["downtempo", "chillout"]),
  g("triphop", "trip hop", ["trip hop", "triphop"], ["trip hop", "trip-hop"]),
  g("idm", "IDM", ["idm", "glitch", "experimental electronic"], ["idm", "glitch electronic"]),
  g("synthwave", "synthwave", ["synthwave", "retrowave", "outrun", "darksynth"], [
    "synthwave",
    "retrowave",
  ]),
  g("vaporwave", "vaporwave", ["vaporwave", "vapourwave"], ["vaporwave", "vapor soul"]),
  g("lofi", "lo-fi", ["lofi", "lo-fi", "lofi hip hop", "chillhop", "jazzhop"], [
    "lofi hip hop",
    "chillhop",
  ]),

  // --- Soul / R&B / funk ---
  g("rnb", "R&B", ["r&b", "rnb", "rhythm and blues", "contemporary r&b"], ["r&b", "rnb"]),
  g("neosoul", "neo soul", ["neo soul", "neosoul", "alternative r&b"], ["neo soul", "neo-soul"]),
  g("soul", "soul", ["soul", "soul music"], ["soul", "classic soul"]),
  g("funk", "funk", ["funk", "funk music"], ["funk", "funk grooves"]),
  g("disco", "disco", ["disco", "nu disco", "nu-disco"], ["disco", "nu disco"]),
  g("motown", "Motown", ["motown"], ["motown", "60s soul"]),
  g("gospel", "gospel", ["gospel", "worship", "christian"], ["gospel", "worship"]),

  // --- Jazz / blues / acoustic ---
  g("jazz", "jazz", ["jazz", "jazz music"], ["jazz", "jazz standards"]),
  g("bossa", "bossa nova", ["bossa nova", "bossa", "brazilian jazz"], ["bossa nova", "brazilian jazz"]),
  g("swing", "swing", ["swing", "big band"], ["swing", "big band jazz"]),
  g("blues", "blues", ["blues", "delta blues"], ["blues", "delta blues"]),
  g("country", "country", ["country", "country music", "country western"], ["country", "country hits"]),
  g("americana", "americana", ["americana", "alt country", "alt-country"], ["americana", "alt country"]),
  g("folk", "folk", ["folk", "folk music", "acoustic folk"], ["folk", "indie folk"]),
  g("singersongwriter", "singer-songwriter", ["singer songwriter", "singer-songwriter", "songwriter"], [
    "singer songwriter",
    "acoustic singer songwriter",
  ]),
  g("bluegrass", "bluegrass", ["bluegrass", "banjo"], ["bluegrass", "newgrass"]),
  g("classical", "classical", ["classical", "classical music", "orchestra", "orchestral"], [
    "classical",
    "orchestral",
  ]),
  g("piano", "piano", ["piano", "solo piano", "piano music"], ["solo piano", "piano"]),
  g("soundtrack", "soundtrack", ["soundtrack", "film score", "movie music", "cinematic music"], [
    "soundtrack",
    "film score",
  ]),
  g("gamemusic", "video game music", ["video game music", "game music", "chiptune", "vgm"], [
    "video game music",
    "chiptune",
  ]),
  g("anime", "anime", ["anime", "anime openings", "anime ost", "japanese anime"], [
    "anime opening",
    "anime ost",
  ]),

  // --- Latin / Caribbean / African / global ---
  g("latin", "latin", ["latin", "latin music", "latino"], ["latin", "latin hits"]),
  g("reggaeton", "reggaeton", ["reggaeton", "regueton", "perreo"], ["reggaeton", "reggaeton hits"]),
  g("salsa", "salsa", ["salsa", "salsa music"], ["salsa", "salsa dura"]),
  g("bachata", "bachata", ["bachata"], ["bachata", "bachata romantica"]),
  g("cumbia", "cumbia", ["cumbia", "cumbia sonidera"], ["cumbia", "cumbia moderna"]),
  g("dembow", "dembow", ["dembow", "dominican dembow"], ["dembow"]),
  g("latinpop", "latin pop", ["latin pop", "latinpop", "spanish pop"], ["latin pop", "spanish pop"]),
  g("afrobeats", "afrobeats", ["afrobeats", "afrobeat", "afro beats"], ["afrobeats", "afrobeats hits"]),
  g("amapiano", "amapiano", ["amapiano", "ama piano"], ["amapiano", "amapiano grooves"]),
  g("highlife", "highlife", ["highlife", "afro highlife"], ["highlife", "afro highlife"]),
  g("reggae", "reggae", ["reggae", "roots reggae"], ["reggae", "roots reggae"]),
  g("dancehall", "dancehall", ["dancehall", "dance hall"], ["dancehall", "dancehall riddim"]),
  g("soca", "soca", ["soca", "calypso"], ["soca", "calypso"]),
  g("bollywood", "bollywood", ["bollywood", "hindi songs", "hindi", "filmi"], ["bollywood", "hindi songs"]),
  g("desi", "desi", ["desi", "punjabi", "bhangra", "indian"], ["punjabi", "bhangra", "desi hits"]),
  g("arabic", "arabic", ["arabic", "arabic music", "khaleeji"], ["arabic", "arabic pop"]),
  g("turkish", "turkish", ["turkish", "turkish pop", "turkce"], ["turkish pop", "turkish"]),
  g("frenchpop", "french pop", ["french pop", "french music", "chanson"], ["french pop", "chanson"]),
  g("germanrap", "german rap", ["german rap", "deutschrap", "german hip hop"], ["german rap", "deutschrap"]),
  g("italodisco", "italo disco", ["italo disco", "italian disco"], ["italo disco", "italian disco"]),
  g("k-indie", "k-indie", ["k-indie", "korean indie", "korean r&b"], ["korean indie", "k-rnb"]),

  // --- Mood ---
  m("chill", "chill", ["chill", "chilled", "chill out", "laid back", "laid-back", "mellow", "easy listening"]),
  m("relax", "relaxing", ["relax", "relaxing", "calm", "peaceful", "soothing", "gentle"]),
  m("sad", "sad", ["sad", "sad songs", "tearful", "crying", "heartbreak", "heartbroken", "breakup"]),
  m("melancholy", "melancholic", ["melancholy", "melancholic", "moody", "wistful", "bittersweet"]),
  m("happy", "happy", ["happy", "feel good", "feel-good", "cheerful", "joyful", "sunny"]),
  m("uplifting", "uplifting", ["uplifting", "hopeful", "inspiring", "motivational", "empowering"]),
  m("euphoric", "euphoric", ["euphoric", "euphoria", "blissful", "anthemic"]),
  m("energetic", "energetic", ["energetic", "high energy", "hype", "banger", "upbeat", "lively"]),
  m("aggressive", "aggressive", ["aggressive", "angry", "hard", "heavy", "intense", "rage"]),
  m("dark", "dark", ["dark", "darkness", "eerie", "haunting", "sinister"]),
  m("romantic", "romantic", ["romantic", "romance", "love songs", "love", "date night"]),
  m("sensual", "sensual", ["sensual", "sexy", "sultry", "smooth"]),
  m("nostalgic", "nostalgic", ["nostalgic", "nostalgia", "throwback", "memories", "childhood"]),
  m("dreamy", "dreamy", ["dreamy", "ethereal", "hazy", "floating", "atmospheric"]),
  m("focus", "focus", ["focus", "concentration", "productive", "deep work"]),
  m("cinematic", "cinematic", ["cinematic", "epic", "dramatic", "trailer", "sweeping"]),
  m("cozy", "cozy", ["cozy", "cosy", "warm", "comfort", "comforting"]),
  m("rainy", "rainy", ["rainy", "rain", "stormy", "gloomy", "cloudy"]),
  m("summer", "summer", ["summer", "summery", "beach", "poolside", "vacation"]),
  m("winter", "winter", ["winter", "snow", "christmas", "holiday"]),
  m("sunset", "sunset", ["sunset", "golden hour", "dusk"]),
  m("night", "late night", ["late night", "night", "midnight", "after hours", "afterhours", "nocturnal"]),
  m("introspective", "introspective", ["introspective", "reflective", "thoughtful", "deep"]),

  // --- Occasion / activity ---
  o("gym", "gym", ["gym", "workout", "lifting", "weights", "training", "fitness"], [
    "workout",
    "gym motivation",
  ]),
  o("running", "running", ["running", "run", "jogging", "cardio", "sprinting"], ["running", "cardio"]),
  o("party", "party", ["party", "party music", "club", "clubbing", "night out", "festival"], [
    "party",
    "club",
  ]),
  o("dinner", "dinner", ["dinner", "dinner party", "supper", "restaurant", "brunch"], [
    "dinner party",
    "dinner jazz",
  ]),
  o("drive", "night drive", ["driving", "drive", "road trip", "roadtrip", "cruise", "cruising"], [
    "night drive",
    "driving",
  ]),
  o("commute", "commute", ["commute", "commuting", "train", "subway"], ["commute", "city pop"]),
  o("gaming", "gaming", ["gaming", "video games", "gamer", "twitch"], ["gaming", "game soundtrack"]),
  o("coding", "coding", ["coding", "programming", "writing code", "dev work"], [
    "coding",
    "electronic focus",
  ]),
  o("reading", "reading", ["reading", "book", "library"], ["reading", "acoustic instrumental"]),
  o("cooking", "cooking", ["cooking", "kitchen", "baking"], ["cooking", "soul food"]),
  o("study", "study", ["study", "studying", "homework", "revision"], ["study music", "focus music"]),
  o("yoga", "yoga", ["yoga", "stretching", "pilates"], ["yoga", "meditation"]),
  o("meditation", "meditation", ["meditation", "meditate", "mindfulness", "breathing"], [
    "meditation",
    "mindfulness",
  ]),
  o("sleep", "sleep", ["sleep", "sleeping", "bedtime", "insomnia", "lullaby"], ["sleep", "sleep music"]),
  o("shower", "shower", ["shower", "singing in the shower"], ["shower songs", "pop hits"]),
  o("karaoke", "karaoke", ["karaoke", "sing along", "singalong"], ["karaoke", "sing along hits"]),
  o("wedding", "wedding", ["wedding", "reception", "first dance"], ["wedding", "wedding reception"]),
  o("camping", "camping", ["camping", "campfire", "outdoors", "hiking"], ["campfire", "folk camping"]),
];

/** Energy words. Low pulls the target down, high pulls it up. */
export const ENERGY_WORDS: { words: string[]; value: number }[] = [
  {
    words: [
      "ambient", "sleep", "lullaby", "soft", "quiet", "background", "gentle", "slow",
      "mellow", "calm", "meditation", "cozy", "rainy", "piano", "acoustic", "study",
      "focus", "downtempo",
    ],
    value: 0.16,
  },
  {
    words: ["chill", "relax", "laid back", "lofi", "lo-fi", "jazz", "bossa", "soul", "dinner", "reading"],
    value: 0.34,
  },
  {
    words: [
      "hype", "banger", "hard", "aggressive", "fast", "energetic", "upbeat", "festival",
      "gym", "workout", "running", "party", "club", "dance", "rave", "mosh", "intense",
      "loud", "rage", "drill", "phonk",
    ],
    value: 0.84,
  },
];

export const POPULARITY_WORDS: { words: string[]; value: number }[] = [
  {
    words: [
      "underground", "deep cut", "deep cuts", "obscure", "hidden gem", "hidden gems",
      "b-sides", "b sides", "rare", "less known",
    ],
    value: 34,
  },
  {
    words: [
      "mainstream", "popular", "hits", "hit songs", "top 40", "chart", "charts",
      "famous", "well known", "well-known", "classics",
    ],
    value: 80,
  },
];

export const INSTRUMENTAL_TRIGGERS = [
  "instrumental",
  "no lyrics",
  "no vocals",
  "without lyrics",
  "without vocals",
  "no singing",
  "beats only",
  "music only",
  "no words",
];

export const CLEAN_TRIGGERS = [
  "clean",
  "no explicit",
  "no swearing",
  "no cursing",
  "family friendly",
  "family-friendly",
  "kid friendly",
  "kid-friendly",
  "radio edit",
  "radio edits",
];

export const ARTIST_PATTERNS = [
  /\b(?:sounds?|music|songs?|stuff|artists?|bands?|things?)\s+(?:like|similar to)\s+([a-z0-9][a-z0-9'&.\- ]{1,60})/g,
  /\bsimilar to\s+([a-z0-9][a-z0-9'&.\- ]{1,60})/g,
  /\b(?:by|from)\s+([a-z0-9][a-z0-9'&.\- ]{1,40})/g,
];

/** Words that end an artist phrase extracted by ARTIST_PATTERNS. */
export const PHRASE_STOP =
  /\b(?:and|but|or|with|without|instead|please|that|which|who|so|then|too|also|for|in|on|at|to)\b/;

export const ERA_WORDS: { words: string[]; range: [number, number] }[] = [
  { words: ["50s", "fifties"], range: [1950, 1959] },
  { words: ["60s", "sixties"], range: [1960, 1969] },
  { words: ["70s", "seventies"], range: [1970, 1979] },
  { words: ["80s", "eighties"], range: [1980, 1989] },
  { words: ["90s", "nineties"], range: [1990, 1999] },
  { words: ["00s", "2000s", "noughties", "aughts"], range: [2000, 2009] },
  { words: ["10s", "2010s"], range: [2010, 2019] },
  { words: ["20s", "2020s"], range: [2020, 2029] },
  { words: ["modern", "recent", "new", "newer", "fresh", "current"], range: [2019, 2026] },
  {
    words: ["classic", "classics", "oldies", "old school", "old-school", "vintage", "retro"],
    range: [1955, 1999],
  },
  { words: ["throwback"], range: [1990, 2015] },
];

export const LANGUAGE_WORDS: { words: string[]; label: string; query: string }[] = [
  { words: ["spanish", "espanol", "español", "castellano"], label: "spanish", query: "spanish" },
  { words: ["korean", "hangul"], label: "korean", query: "korean" },
  { words: ["japanese", "nihongo"], label: "japanese", query: "japanese" },
  { words: ["french", "francais", "français"], label: "french", query: "french" },
  { words: ["german", "deutsch"], label: "german", query: "german" },
  { words: ["portuguese", "brasileiro", "brazilian"], label: "portuguese", query: "portuguese" },
  { words: ["italian", "italiano"], label: "italian", query: "italian" },
  { words: ["hindi", "urdu"], label: "hindi", query: "hindi" },
  { words: ["arabic", "arabisch"], label: "arabic", query: "arabic" },
  { words: ["turkish", "turkce"], label: "turkish", query: "turkish" },
  { words: ["dutch", "nederlands"], label: "dutch", query: "dutch" },
  { words: ["swedish", "svenska"], label: "swedish", query: "swedish" },
  { words: ["polish", "polski"], label: "polish", query: "polish" },
  { words: ["russian", "русский"], label: "russian", query: "russian" },
];

export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "with", "without", "for", "from", "of", "to", "in", "on",
  "at", "by", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that", "these",
  "those", "i", "me", "my", "we", "our", "you", "your", "he", "she", "they", "them", "some", "any",
  "all", "more", "most", "less", "very", "really", "just", "like", "want", "wants", "need", "needs",
  "please", "make", "makes", "playlist", "songs", "song", "music", "tracks", "track", "mix", "vibe",
  "vibes", "feel", "feels", "feeling", "something", "anything", "lot", "lots", "kind", "sort", "good",
  "great", "best", "new", "old", "also", "too", "not", "no", "except", "avoid", "can", "could",
  "would", "should", "do", "does", "did", "get", "got", "give", "put", "add", "around", "about",
  "into", "over", "under", "up", "down", "out", "off", "then", "than", "when", "where", "which",
  "who", "what", "how", "why", "there", "here", "now", "today", "tonight", "day", "time", "thing",
  "things", "vibey", "vibing", "similar", "sounds", "sound", "artist", "artists", "band", "bands",
  "style", "styles", "type", "types", "mostly", "mainly", "only", "every", "each", "one", "two",
  "three", "ten", "fifty", "50", "hours", "hour", "long", "short", "start", "end", "beginning",
  "middle", "energy", "energetic", "songlist", "would", "should",
]);

export function defaultQueries(entry: LexEntry): string[] {
  return entry.queries ?? [entry.label];
}
