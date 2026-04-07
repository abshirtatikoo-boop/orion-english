// Jumlooyin waxbarasho — Shadowing sentence bank
// 30 sentences: 10 per level, each with English + Somali translation

export interface Sentence {
  id: number
  text: string
  somali: string
}

export interface SentenceBank {
  beginner: Sentence[]
  intermediate: Sentence[]
  advanced: Sentence[]
}

export const sentences: SentenceBank = {
  // ─── Bilow (Beginner) ───────────────────────────────────────────────────────
  beginner: [
    {
      id: 1,
      text: "I wake up at seven every morning.",
      somali: "Subax walba toddoba ayaan kaca.",
    },
    {
      id: 2,
      text: "She drinks coffee before going to work.",
      somali: "Shaqada ka hor ayay qaxwo cabbtaa.",
    },
    {
      id: 3,
      text: "We live in a small apartment.",
      somali: "Guryaha yar ayaannu degannnahay.",
    },
    {
      id: 4,
      text: "He is reading a book right now.",
      somali: "Hadda ayuu buug akhriyaa.",
    },
    {
      id: 5,
      text: "They go to the market every Friday.",
      somali: "Jimce walba suuqa ayay tagaan.",
    },
    {
      id: 6,
      text: "I cannot find my keys.",
      somali: "Furahahayga ma heli karo.",
    },
    {
      id: 7,
      text: "The weather is very hot today.",
      somali: "Maanta cimiladu aad bay u kulushahay.",
    },
    {
      id: 8,
      text: "Can you help me please?",
      somali: "Ma i caawin kartaa fadlan?",
    },
    {
      id: 9,
      text: "I need to buy some food.",
      somali: "Waxaan u baahan ahay inaaan cunto gato.",
    },
    {
      id: 10,
      text: "How much does this cost?",
      somali: "Imisa ayay tiri?",
    },
  ],

  // ─── Dhexe (Intermediate) ──────────────────────────────────────────────────
  intermediate: [
    {
      id: 11,
      text: "I've been working here for three years.",
      somali: "Saddex sano ayaan halkan ka shaqeynayay.",
    },
    {
      id: 12,
      text: "She couldn't sleep because she was anxious.",
      somali: "Hurdaan kari waysay waxaa sabab u ahaa walbahaarka.",
    },
    {
      id: 13,
      text: "We should have left earlier to avoid traffic.",
      somali: "Waa inaan hore uga baxnay si taraafikada looga fogaado.",
    },
    {
      id: 14,
      text: "He mentioned that he might be late for the meeting.",
      somali: "Wuxuu sheegay inuu laga yaabo shirka dib u dhacayo.",
    },
    {
      id: 15,
      text: "I'm looking forward to hearing from you soon.",
      somali: "Waxaan sugayaa inaad xog ii soo dirtid dhawaan.",
    },
    {
      id: 16,
      text: "The project deadline has been moved to next week.",
      somali: "Xadka wakhtiga mashruuca ayaa la raro toddobaadka dambe.",
    },
    {
      id: 17,
      text: "Could you explain that in a different way?",
      somali: "Ma ii sharxi kartaa si kale?",
    },
    {
      id: 18,
      text: "I would appreciate it if you responded quickly.",
      somali: "Waan mahadsan lahaa haddaad degdeg u jawaabto.",
    },
    {
      id: 19,
      text: "She has already submitted her application for the job.",
      somali: "Codsigii shaqada ayay horey u gudbisay.",
    },
    {
      id: 20,
      text: "We need to discuss this before making any decisions.",
      somali: "Waa inaan kaga hadalnaa tani ka hor intaan go'aan la gaarin.",
    },
  ],

  // ─── Horumarsan (Advanced) ─────────────────────────────────────────────────
  advanced: [
    {
      id: 21,
      text: "Despite the challenges, the team managed to deliver exceptional results.",
      somali: "Caqabadaha jira ka dib, kooxdu waxay guulaysatay natiijooyin aad u fiican.",
    },
    {
      id: 22,
      text: "The policy was implemented without considering its long-term consequences.",
      somali: "Siyaasadda waxaa la fuliyey la'aanteed in la tixgeliyo cawaaqibkeeda fog.",
    },
    {
      id: 23,
      text: "She articulated her argument with remarkable clarity and precision.",
      somali: "Waxay si cad oo saxsan u sharraxday dooddeeda.",
    },
    {
      id: 24,
      text: "Technological advancements have fundamentally altered the way we communicate.",
      somali: "Horumarinta teknoolajiyada ayaa si aasaasi ah u bedeshay habka aanu xiriirno.",
    },
    {
      id: 25,
      text: "I would have pursued a different career had I known what I know now.",
      somali: "Xirfad kale baan raadin lahaa haddaan ogaan lahaa waxa aan hadda ogahay.",
    },
    {
      id: 26,
      text: "The evidence presented was insufficient to support the initial hypothesis.",
      somali: "Caddeymaha la soo bandhigay ma ahayn kuwo ku filan in lagu taageero tilmaamaha hore.",
    },
    {
      id: 27,
      text: "Negotiating a fair compromise requires both empathy and strategic thinking.",
      somali: "Hagaajinta xalka caddaalada ah wuxuu u baahan yahay labadaba naxariis iyo fikirsi tiraatiijiyadeed.",
    },
    {
      id: 28,
      text: "The implications of this discovery extend far beyond what was initially anticipated.",
      somali: "Saameynta helitaanka kan waxay ka fog tahay waxa markii hore la filayay.",
    },
    {
      id: 29,
      text: "Consistent practice, not raw talent, is what separates experts from amateurs.",
      somali: "Tababarka joogtada ah, ee ma aha kartida dabiiciga ah, ayaa khabiirada ka soocda kuwa bilowga ah.",
    },
    {
      id: 30,
      text: "His reluctance to delegate responsibilities significantly hindered the project's progress.",
      somali: "Diidashadiisa in uu mas'uuliyaadka u qaybsho ayaa si weyn u carqaladeysay horumarinta mashruuca.",
    },
  ],
}

export type Level = keyof SentenceBank
