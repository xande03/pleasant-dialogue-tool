/**
 * Base de conhecimento de referências contemporâneas para expandir prompts
 * com analogias visuais canônicas antes de enviar ao modelo de imagem.
 *
 * Cada entrada mapeia um termo (case-insensitive, palavra inteira) para uma
 * descrição visual factual em inglês (época, aparência, estética típica).
 * Isso ajuda o modelo a "reconhecer" referências que ele pode não conhecer
 * bem, aumentando fidelidade a filmes, diretores, artistas, políticos e
 * fenômenos culturais atuais.
 */

export type KnowledgeEntry = {
  /** aliases opcionais (além da chave) */
  aliases?: string[];
  /** descrição visual canônica em inglês */
  visual: string;
  /** categoria — usada só para depuração/UX futura */
  category:
    | "director"
    | "film"
    | "genre"
    | "artist"
    | "musician"
    | "politician"
    | "brand"
    | "phenomenon"
    | "culture";
};

export const KNOWLEDGE: Record<string, KnowledgeEntry> = {
  // ---------- Diretores / estilo cinematográfico ----------
  "wes anderson": {
    category: "director",
    visual:
      "symmetrical centered composition, pastel color palette, flat frontal staging, meticulous production design, 1.85:1 framing, whimsical retro aesthetic",
  },
  "christopher nolan": {
    category: "director",
    visual:
      "IMAX 65mm large-format cinematography, practical effects, cold desaturated palette, tactile realism, high-contrast lighting, epic scale",
  },
  "denis villeneuve": {
    category: "director",
    visual:
      "monumental scale, muted amber and slate palette, atmospheric haze, minimalist brutalist architecture, anamorphic lens, contemplative silence",
  },
  "greta gerwig": {
    category: "director",
    visual:
      "warm pastel palette, playful production design, hyper-styled sets, character-driven framing, contemporary feminine aesthetic",
  },
  "jordan peele": {
    category: "director",
    visual:
      "uncanny suburban Americana, sharp saturated color, unsettling symmetry, social-horror atmosphere, deliberate slow zooms",
  },
  "quentin tarantino": {
    category: "director",
    visual:
      "35mm film grain, saturated retro palette, stylized violence, low-angle trunk shots, dialogue-heavy staging, 70s exploitation homage",
  },
  "kleber mendonca filho": {
    aliases: ["kleber mendonça filho"],
    category: "director",
    visual:
      "contemporary Brazilian northeast setting (Recife), naturalistic light, social-political undertones, wide static framing",
  },

  // ---------- Filmes / franquias recentes ----------
  "oppenheimer": {
    category: "film",
    visual:
      "1940s Los Alamos aesthetic, IMAX black-and-white and color mix, orange nuclear glow, wool suits and fedoras, chalkboards and blueprints",
  },
  "barbie": {
    category: "film",
    visual:
      "hyper-saturated Barbiecore pink, plastic doll-like sheen, Malibu Dreamhouse set design, 2023 Greta Gerwig aesthetic",
  },
  "dune": {
    category: "film",
    visual:
      "Arrakis desert dunes, ochre and beige palette, brutalist Fremen architecture, stillsuits, giant sandworms, Villeneuve 2021 aesthetic",
  },
  "everything everywhere all at once": {
    category: "film",
    visual:
      "multiverse chaos, laundromat setting, googly eyes motif, kinetic editing, absurdist maximalism, 2022 A24 aesthetic",
  },
  "the batman": {
    category: "film",
    visual:
      "rain-soaked noir Gotham, deep amber streetlights, grungy realism, Robert Pattinson emo Batman, 2022 Matt Reeves aesthetic",
  },
  "cidade de deus": {
    aliases: ["city of god"],
    category: "film",
    visual:
      "1970s Rio de Janeiro favela, sun-bleached warm palette, handheld kinetic camera, Fernando Meirelles aesthetic",
  },
  "tropa de elite": {
    category: "film",
    visual:
      "BOPE Brazilian police, black tactical gear with skull-and-dagger insignia, favela raids, gritty handheld realism",
  },

  // ---------- Gêneros / movimentos ----------
  "cyberpunk": {
    category: "genre",
    visual:
      "neon-drenched rainy megacity, holographic signage, cybernetic implants, Blade Runner 2049 palette of magenta and cyan against black",
  },
  "solarpunk": {
    category: "genre",
    visual:
      "lush green architecture, solar panels integrated with vegetation, art nouveau curves, hopeful bright natural light",
  },
  "cottagecore": {
    category: "genre",
    visual:
      "rural English countryside, floral dresses, wildflowers, soft golden-hour light, rustic wooden interiors, wholesome pastoral aesthetic",
  },
  "y2k": {
    category: "genre",
    visual:
      "late-1990s to early-2000s aesthetic, chrome and frosted plastic, low-rise jeans, butterfly clips, iridescent holographic surfaces",
  },
  "vaporwave": {
    category: "genre",
    visual:
      "pink and cyan gradients, Roman busts, Windows 95 UI elements, palm trees, 80s mall aesthetic, VHS glitch",
  },
  "dark academia": {
    category: "genre",
    visual:
      "old European university, tweed and wool, candlelit libraries, oxblood and forest green palette, autumnal moody lighting",
  },

  // ---------- Políticos (aparência factual, neutra) ----------
  "lula": {
    aliases: ["luiz inacio lula da silva", "luiz inácio lula da silva"],
    category: "politician",
    visual:
      "elderly Brazilian man, white beard, receding gray hair, dark suit, presidential sash of Brazil (green-yellow-blue)",
  },
  "bolsonaro": {
    aliases: ["jair bolsonaro"],
    category: "politician",
    visual:
      "middle-aged Brazilian man, short dark hair, often in yellow Brazilian football jersey or dark suit",
  },
  "biden": {
    aliases: ["joe biden"],
    category: "politician",
    visual:
      "elderly American man, white hair, blue suit, US flag pin, presidential setting",
  },
  "trump": {
    aliases: ["donald trump"],
    category: "politician",
    visual:
      "American man with distinctive blond combover, orange-tan complexion, dark navy suit and long red tie",
  },
  "macron": {
    aliases: ["emmanuel macron"],
    category: "politician",
    visual:
      "French man in his 40s, slicked dark hair, tailored dark suit, Élysée Palace setting",
  },
  "zelensky": {
    aliases: ["volodymyr zelenskyy", "zelenskyy"],
    category: "politician",
    visual:
      "middle-aged Ukrainian man, short beard, olive-green military t-shirt, wartime presidential setting",
  },

  // ---------- Música / artistas atuais ----------
  "taylor swift": {
    category: "musician",
    visual:
      "American singer, long blonde hair, red lipstick, sparkling Eras Tour stage costumes",
  },
  "beyonce": {
    aliases: ["beyoncé"],
    category: "musician",
    visual:
      "American singer, long honey-blonde hair, glamorous couture stage outfits, dramatic stage lighting",
  },
  "anitta": {
    category: "musician",
    visual:
      "Brazilian pop singer, long dark hair, funk carioca stage aesthetic, tropical vibrant styling",
  },
  "bad bunny": {
    category: "musician",
    visual:
      "Puerto Rican reggaeton artist, oversized sunglasses, streetwear, tropical Latin urban aesthetic",
  },
  "billie eilish": {
    category: "musician",
    visual:
      "young American singer, oversized streetwear, currently platinum or black hair, moody green-tinted styling",
  },

  // ---------- Artistas visuais ----------
  "banksy": {
    category: "artist",
    visual:
      "black stencil graffiti on weathered brick walls, political satire, minimal color accents",
  },
  "yayoi kusama": {
    category: "artist",
    visual:
      "obsessive polka dots, mirrored infinity rooms, pumpkin sculptures, red-and-white or yellow-and-black palette",
  },
  "basquiat": {
    aliases: ["jean-michel basquiat"],
    category: "artist",
    visual:
      "neo-expressionist graffiti, crude figures with crowns, raw brushstrokes, primary colors on unprimed canvas",
  },

  // ---------- Marcas / cultura ----------
  "studio ghibli": {
    category: "culture",
    visual:
      "hand-drawn 2D animation, lush painterly backgrounds, soft watercolor skies, whimsical Miyazaki characters",
  },
  "pixar": {
    category: "culture",
    visual:
      "polished 3D animation, expressive stylized characters, warm cinematic lighting, family-friendly appeal",
  },
  "a24": {
    category: "culture",
    visual:
      "indie arthouse aesthetic, 35mm grain, muted painterly palette, intimate character framing",
  },

  // ---------- Fenômenos naturais / atuais ----------
  "aurora boreal": {
    aliases: ["aurora borealis", "northern lights"],
    category: "phenomenon",
    visual:
      "green and magenta ribbons of light dancing across a starry Arctic night sky, reflected on snow",
  },
  "eclipse solar": {
    aliases: ["solar eclipse"],
    category: "phenomenon",
    visual:
      "black lunar disk covering the sun, radiant white corona, darkened daytime sky",
  },
  "queimadas": {
    aliases: ["amazon fires", "wildfire"],
    category: "phenomenon",
    visual:
      "orange flames and thick smoke through charred forest, apocalyptic red-orange sky",
  },
};

/** normaliza para busca: minúsculo, sem acento, colapsa espaços */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** índice reverso: alias -> chave canônica */
const ALIAS_INDEX: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  for (const [key, entry] of Object.entries(KNOWLEDGE)) {
    idx[norm(key)] = key;
    for (const a of entry.aliases ?? []) idx[norm(a)] = key;
  }
  return idx;
})();

/**
 * Detecta termos conhecidos no prompt (busca por substring de palavra
 * inteira, case/accent-insensitive) e anexa suas descrições visuais.
 * Retorna o prompt original + " (nota visual: ...)" para cada match,
 * sem duplicar entradas. Preserva o texto original intacto.
 */
export function expandKnownTerms(prompt: string): {
  expanded: string;
  matches: string[];
} {
  const haystack = norm(prompt);
  const matched = new Set<string>();
  for (const alias of Object.keys(ALIAS_INDEX)) {
    // palavra inteira: bordas de não-letra/dígito
    const re = new RegExp(
      `(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
    );
    if (re.test(haystack)) matched.add(ALIAS_INDEX[alias]);
  }
  if (matched.size === 0) return { expanded: prompt, matches: [] };

  const notes = Array.from(matched)
    .map((key) => `${key}: ${KNOWLEDGE[key].visual}`)
    .join(" | ");
  return {
    expanded: `${prompt.trim()} — [visual references — ${notes}]`,
    matches: Array.from(matched),
  };
}

/* -------------------- cache localStorage de prompts refinados -------------------- */

const CACHE_KEY = "ai-studio:prompt-cache:v1";
const MAX_ENTRIES = 200;

type CacheMap = Record<string, string>;

function readCache(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

function writeCache(map: CacheMap) {
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      // remove os mais antigos (ordem de inserção)
      const trimmed: CacheMap = {};
      for (const k of keys.slice(-MAX_ENTRIES)) trimmed[k] = map[k];
      map = trimmed;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* quota / privacy mode — ignora */
  }
}

export function getCachedEnhancement(key: string): string | null {
  return readCache()[norm(key)] ?? null;
}

export function setCachedEnhancement(key: string, value: string) {
  const map = readCache();
  map[norm(key)] = value;
  writeCache(map);
}
