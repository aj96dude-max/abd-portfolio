export const SITE_META = {
  name: "Abdullah Javed",
  displayName: "abdullah javed",
  roleLabel: "AI & ML Student",
  tagline:
    "I build intelligent systems, train machine learning models, and develop open-source tech.",
  description:
    "Student pursuing a Bachelor of Artificial Intelligence. Focused on Machine Learning, Deep Learning, Computer Vision, and Data Science.",
  email: "aj96dude@gmail.com",
  github: "https://github.com/aj96dude-max",
  githubHandle: "github.com/aj96dude-max",
  resumeUrl: "/Resume.pdf",
  twitterHandle: "@aj96dude-max",
  siteName: "AbdullahJaved",
  keywords: [
    "abdullah javed",
    "AI",
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "Python",
    "Developer",
  ],
} as const;

export const ABOUT_PARAGRAPHS = [
  "I am a dedicated student pursuing a Bachelor of Artificial Intelligence in Pakistan. With a deep passion for technology and data, my expertise spans across Machine Learning, Computer Vision, and Deep Learning. I specialize in building intelligent, scalable systems designed to tackle complex, real-world problems head-on.",
  "My technical journey is driven by an ongoing curiosity to bridge the gap between theoretical algorithms and practical applications. From predicting heart disease using advanced classification models to engineering smart assistive technology for the visually impaired, I thrive on transforming complex datasets into actionable insights and robust tools that make a tangible difference.",
  "Beyond the screen and model training, I believe in the power of creative expression. When I am not immersed in Python scripts or refining neural networks, you can find me exploring the art of storytelling through independent filmmaking, where I co-write and act in narrative-driven short films.",
] as const;

export interface HighlightItem {
  metric: string;
  label: string;
}

export const HIGHLIGHTS: HighlightItem[] = [
  {
    metric: "AI Projects",
    label: "Engineered predictive models and computer vision systems.",
  },
  {
    metric: "Assistive Tech",
    label: "Designed a smart navigation stick for visually impaired.",
  },
  {
    metric: "Tech Research",
    label: "Authored technical papers on cybersecurity and wireless.",
  },
  {
    metric: "Infrastructure",
    label: "Configured robust email servers and optimized SQL data.",
  },
  {
    metric: "Filmmaking",
    label: "Co-created, wrote, and acted in independent short films.",
  },
  {
    metric: "Fitness Content",
    label: "Founded and expanded the berserker gutts fitness brand.",
  },
];

export interface SkillGroup {
  label: string;
  items: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    label: "Programming Languages",
    items: ["Python", "SQL", "C++", "Java"],
  },
  {
    label: "AI & ML",
    items: [
      "Machine Learning",
      "Deep Learning",
      "CNN",
      "RNN",
      "LSTM",
      "GANs",
      "Transformers",
    ],
  },
  {
    label: "Computer Vision",
    items: ["OCR", "CBIR", "Texture Analysis", "Pattern Recognition"],
  },
  {
    label: "Database & Networking",
    items: [
      "SQL",
      "Email Server Configuration",
      "Wi-Fi Technologies",
      "Cybersecurity",
    ],
  },
];

export interface BuildingItem {
  name: string;
  description: string;
  status: "active";
}

export const CURRENTLY_BUILDING: BuildingItem[] = [
  {
    name: "Blind Assistance Kit",
    description:
      "Final Year Project: Smart stick with environment sensing and AI-assisted navigation.",
    status: "active",
  },
  {
    name: "AI Outfit Generator",
    description:
      "Research proposal for an AI-powered wardrobe analysis and recommendation app.",
    status: "active",
  },
];

export interface CreativePursuit {
  title: string;
  prefix: string;
  highlight: string;
  suffix: string;
}

export const CREATIVE_PURSUITS: CreativePursuit[] = [
  {
    title: "Independent Filmmaking",
    prefix: "Story writer, script developer, actor, and crew member. Co-created the time-loop story ",
    highlight: '"Waqtn fa Waqtan"',
    suffix: " and acted in a spiritual-themed short film.",
  },
  {
    title: "Content Creation",
    prefix: "Created and managed the fitness Instagram page ",
    highlight: "berserker_gutts",
    suffix: " focusing on strength training and fitness motivation.",
  },
];

export interface ExplodedCalloutSpec {
  partId: string;
  side: "left" | "right";
  slot: number;
  code: string;
  title: string;
  detail: string;
}

export const EXPLODED_CALLOUTS: ExplodedCalloutSpec[] = [
  {
    partId: "sapphireViewport",
    side: "left",
    slot: 0,
    code: "L01 · SAPPHIRE VIEWPORT",
    title: "Computer Vision & Perception",
    detail: "OCR, CBIR, Texture Analysis & Blind Assistance Kit",
  },
  {
    partId: "neuralDieCore",
    side: "left",
    slot: 1,
    code: "L03 · NEURAL TENSOR DIE",
    title: "Deep Learning Architectures",
    detail: "CNN, RNN, LSTM, GANs & Transformers",
  },
  {
    partId: "heatsinkFins",
    side: "left",
    slot: 2,
    code: "L05 · CNC HEAT-SINK STACK",
    title: "Applied ML Research",
    detail: "AI Outfit Generator & Linear Regression Analysis",
  },
  {
    partId: "titaniumTopPlate",
    side: "right",
    slot: 0,
    code: "L02 · BRUSHED TITANIUM PLATE",
    title: "Intelligent Systems Stack",
    detail: "Python, SQL, C++ & Java Runtime Foundations",
  },
  {
    partId: "copperBusPlate",
    side: "right",
    slot: 1,
    code: "L04 · COPPER THERMAL BUS",
    title: "Predictive Diagnostics",
    detail: "Heart Disease Random Forest & Data Science",
  },
  {
    partId: "baseChassis",
    side: "right",
    slot: 2,
    code: "L06 · GUNMETAL BASE CHASSIS",
    title: "Infrastructure & Security",
    detail: "Email Server Architecture, Wi-Fi & Cybersecurity",
  },
];

export const NAV_LINKS = [
  { name: "About", href: "#about", cue: "close" },
  { name: "Stack", href: "#skills", cue: "close" },
  { name: "Work", href: "#projects", cue: "apart" },
  { name: "Highlights", href: "#highlights", cue: "around" },
  { name: "Contact", href: "#contact", cue: "rebuild" },
] as const;

