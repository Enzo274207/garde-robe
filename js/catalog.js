// Référentiel : catégories, types, couleurs, coupes.

export const CATEGORIES = {
  haut: {
    key: 'haut', title: 'Hauts', one: 'un haut', empty: 'Aucun haut ne correspond',
    types: ['T-shirt', 'Pull', 'Sweat', 'Veste', 'Chemise'],
    plural: { 'T-shirt': 'T-shirts', Pull: 'Pulls', Sweat: 'Sweats', Veste: 'Vestes', Chemise: 'Chemises' },
    fits: ['Ajusté', 'Regular', 'Ample'], fitWord: 'Coupe'
  },
  bas: {
    key: 'bas', title: 'Bas', one: 'un bas', empty: 'Aucun bas ne correspond',
    types: ['Jean', 'Pantalon', 'Chino', 'Jogging', 'Cargo', 'Short'],
    plural: { Jean: 'Jeans', Pantalon: 'Pantalons', Chino: 'Chinos', Jogging: 'Joggings', Cargo: 'Cargos', Short: 'Shorts' },
    fits: ['Ajusté', 'Regular', 'Ample'], fitWord: 'Coupe'
  },
  chaussures: {
    key: 'chaussures', title: 'Chaussures', one: 'des chaussures', empty: 'Aucune paire ne correspond',
    types: ['Baskets', 'Running', 'Ville', 'Bottines'],
    plural: { Baskets: 'Baskets', Running: 'Running', Ville: 'Ville', Bottines: 'Bottines' },
    fits: ['Basses', 'Montantes'], fitWord: 'Tige'
  },
  veste: {
    key: 'veste', title: 'Vestes', one: 'une veste', empty: 'Aucune veste ne correspond',
    types: ['Blouson', 'Veste', 'Manteau', 'Doudoune', 'Coupe-vent'],
    plural: { Blouson: 'Blousons', Veste: 'Vestes', Manteau: 'Manteaux', Doudoune: 'Doudounes', 'Coupe-vent': 'Coupe-vent' },
    fits: ['Ajusté', 'Regular', 'Ample'], fitWord: 'Coupe'
  },
  accessoire: {
    key: 'accessoire', title: 'Accessoires', one: 'un accessoire', empty: 'Aucun accessoire ne correspond',
    types: ['Casquette', 'Bonnet', 'Sac', 'Ceinture', 'Lunettes', 'Écharpe', 'Montre', 'Bague', 'Chaîne', 'Bracelet'],
    plural: { Casquette: 'Casquettes', Bonnet: 'Bonnets', Sac: 'Sacs', Ceinture: 'Ceintures', Lunettes: 'Lunettes', 'Écharpe': 'Écharpes', Montre: 'Montres', Bague: 'Bagues', 'Chaîne': 'Chaînes', Bracelet: 'Bracelets' },
    fits: [], fitWord: ''
  }
};
// Un bas court (short, bermuda) : dessiné plus court, les chaussures ne passent pas dessous,
// et la styliste le garde pour quand il fait chaud.
export const isShort = (it) => !!it && it.category === 'bas' && /short|bermuda/i.test(it.type || '');
export const CAT_ORDER = ['haut', 'bas', 'veste', 'chaussures', 'accessoire'];
// Taille d'un accessoire sur la planche de la tenue (en % de la largeur) : les bijoux restent petits.
// Un type inconnu (ancienne pièce) prend une taille moyenne.
export const ACC_SIZE = { Bague: 11, Bracelet: 14, Montre: 14, 'Chaîne': 18, Lunettes: 17, Ceinture: 20, Casquette: 24, Bonnet: 23, 'Écharpe': 24, Sac: 26 };
export const MAX_ACC = 12;   // accessoires portés en même temps (même limite que la base, migration 004)

// Caractéristiques facultatives d'une fiche
export const SEASONS = ['Printemps', 'Été', 'Automne', 'Hiver'];
export const STYLES = ['Streetwear', 'Casual', 'Chic', 'Sport', 'Classique', 'Workwear'];
export const WARMTH = ['Très léger', 'Léger', 'Moyen', 'Chaud', 'Très chaud'];          // 1 à 5
export const FORMALITY = ['Détente', 'Décontracté', 'Smart', 'Habillé', 'Très habillé']; // 1 à 5

// Palette de base. Les 15 premières couleurs existaient déjà : ne jamais changer leur nom ni leur code
// (des pièces enregistrées les utilisent). On peut en ajouter à la suite.
// Chaque pièce peut aussi avoir une couleur exacte (curseur ou pipette) : elle est alors rattachée
// à la couleur la plus proche de cette palette, sa « famille », pour le nom, les filtres et la styliste.
export const PALETTE = [
  { label: 'Blanc', hex: '#F4F2EE', neutral: true },
  { label: 'Noir', hex: '#1E1E1E', neutral: true },
  { label: 'Gris', hex: '#8C8C8C', neutral: true },
  { label: 'Marine', hex: '#27324F', neutral: true },
  { label: 'Bleu', hex: '#3D63A8', neutral: false },
  { label: 'Bleu ciel', hex: '#9DBBD6', neutral: false },
  { label: 'Beige', hex: '#CDB892', neutral: true },
  { label: 'Marron', hex: '#6B4A32', neutral: true },
  { label: 'Vert', hex: '#5F7A57', neutral: false },
  { label: 'Kaki', hex: '#6B6A4A', neutral: true },
  { label: 'Bordeaux', hex: '#7A2531', neutral: false },
  { label: 'Rouge', hex: '#B8322E', neutral: false },
  { label: 'Jaune', hex: '#D9B23A', neutral: false },
  { label: 'Or', hex: '#D4AF5A', neutral: true },
  { label: 'Argent', hex: '#C9CCD1', neutral: true },
  // ajoutées ensuite
  { label: 'Écru', hex: '#E8E0CC', neutral: true },
  { label: 'Anthracite', hex: '#3A3B3E', neutral: true },
  { label: 'Camel', hex: '#B5834F', neutral: true },
  { label: 'Rose', hex: '#E79AB0', neutral: false },
  { label: 'Rose pâle', hex: '#F2CBD5', neutral: false },
  { label: 'Fuchsia', hex: '#C2306F', neutral: false },
  { label: 'Violet', hex: '#6B3F8F', neutral: false },
  { label: 'Lavande', hex: '#B7A8D8', neutral: false },
  { label: 'Prune', hex: '#5A2A48', neutral: false },
  { label: 'Orange', hex: '#E07A2E', neutral: false },
  { label: 'Corail', hex: '#EC7F6A', neutral: false },
  { label: 'Terracotta', hex: '#B5573A', neutral: false },
  { label: 'Moutarde', hex: '#B8862B', neutral: false },
  { label: 'Vert sapin', hex: '#2F4F3A', neutral: false },
  { label: 'Vert menthe', hex: '#A8D5BA', neutral: false },
  { label: 'Turquoise', hex: '#3AA6A0', neutral: false },
  { label: 'Bleu roi', hex: '#2B4BC8', neutral: false }
];
// Ordre d'affichage des pastilles (par teinte), sans toucher à la liste ci-dessus
export const PALETTE_VIEW = ['Blanc', 'Écru', 'Beige', 'Camel', 'Marron', 'Argent', 'Gris', 'Anthracite', 'Noir', 'Marine',
  'Bleu roi', 'Bleu', 'Bleu ciel', 'Turquoise', 'Vert menthe', 'Vert', 'Vert sapin', 'Kaki', 'Jaune', 'Moutarde', 'Or',
  'Orange', 'Corail', 'Terracotta', 'Rouge', 'Bordeaux', 'Rose pâle', 'Rose', 'Fuchsia', 'Lavande', 'Violet', 'Prune']
  .map((l) => PALETTE.find((p) => p.label === l)).filter(Boolean);
// Couleur toujours au format #RRGGBB avant d'être insérée dans du HTML/SVG
export const safeColor = (hex) => (/^#[0-9a-fA-F]{6}$/.test(String(hex)) ? String(hex) : '#8C8C8C');
export const inPalette = (hex) => PALETTE.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || null;

// Écart perçu entre deux couleurs (CIE Lab) : la teinte compte plus que l'intensité,
// pour qu'un rose vif reste un rose et ne devienne pas un rouge.
export const hexToRgb = (hex) => { const h = safeColor(hex); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
export const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function lab(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; });
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const LAB = new Map();
const labOf = (hex) => { const k = safeColor(hex).toUpperCase(); if (!LAB.has(k)) LAB.set(k, lab(k)); return LAB.get(k); };
export const colorDistance = (a, b) => {
  const p = labOf(a), q = labOf(b), dl = p[0] - q[0], dc = Math.hypot(p[1], p[2]) - Math.hypot(q[1], q[2]);
  const dh2 = Math.max(0, (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 - dc * dc);
  return Math.sqrt(dl * dl + 0.3 * dc * dc + 3 * dh2);
};
// Famille d'une couleur : elle-même si elle est dans la palette, sinon la couleur de palette la plus proche
export const colorFamily = (hex) => inPalette(hex) || PALETTE.reduce((a, b) => (colorDistance(hex, b.hex) < colorDistance(hex, a.hex) ? b : a));
export const sameFamily = (a, b) => colorFamily(a) === colorFamily(b);
export const colorLabel = (hex) => colorFamily(hex).label;
export const isNeutral = (hex) => colorFamily(hex).neutral;
export const isDark = (hex) => {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 110;
};

// Avatar
export const AV = {
  skin: [
    { label: 'Très claire', hex: '#F1D9C5', dark: '#DDBFA8', lip: '#C98A7E' },
    { label: 'Claire', hex: '#E2BE9F', dark: '#CBA383', lip: '#B9786A' },
    { label: 'Mate', hex: '#C99B76', dark: '#B0825F', lip: '#9A6052' },
    { label: 'Hâlée', hex: '#A87652', dark: '#8F6040', lip: '#7D4A3C' },
    { label: 'Foncée', hex: '#7E5236', dark: '#673F28', lip: '#5A3326' },
    { label: 'Très foncée', hex: '#573826', dark: '#432A1C', lip: '#3E2419' }
  ],
  hair: [
    { label: 'Noir', hex: '#1D1A18' }, { label: 'Brun', hex: '#4A3022' }, { label: 'Châtain', hex: '#7A5333' },
    { label: 'Blond', hex: '#C9A162' }, { label: 'Roux', hex: '#A4532B' }, { label: 'Gris', hex: '#9C9893' }
  ],
  eye: [
    { label: 'Marron', hex: '#5A3A22' }, { label: 'Noisette', hex: '#8A6A3A' }, { label: 'Bleu', hex: '#4F7DB0' },
    { label: 'Vert', hex: '#5E8456' }, { label: 'Gris', hex: '#7D8A93' }
  ],
  hairStyle: ['Court', 'Dégradé', 'Mi-long', 'Bouclé', 'Rasé'],
  eyeShape: ['Amande', 'Ronds', 'Étroits'],
  eyeSize: ['Petits', 'Moyens', 'Grands'],
  beard: ['Aucune', 'Courte', 'Pleine'],
  build: ['Mince', 'Normale', 'Athlétique']
};
export const DEFAULT_AVATAR = { skin: 2, hair: 0, eye: 0, hairStyle: 'Court', eyeShape: 'Amande', eyeSize: 'Moyens', beard: 'Aucune', build: 'Normale' };

// Pièces d'exemple pour le mode démo
export const DEMO_ITEMS = [
  { category: 'haut', type: 'T-shirt', name: 'T-shirt blanc', color_name: 'Blanc', color_hex: '#F4F2EE', fit: 'Ajusté' },
  { category: 'haut', type: 'Pull', name: 'Pull col rond marine', color_name: 'Marine', color_hex: '#27324F', fit: 'Regular' },
  { category: 'haut', type: 'Sweat', name: 'Sweat oversize gris', color_name: 'Gris', color_hex: '#8C8C8C', fit: 'Ample' },
  { category: 'haut', type: 'Veste', name: 'Veste bordeaux', color_name: 'Bordeaux', color_hex: '#7A2531', fit: 'Regular' },
  { category: 'bas', type: 'Jean', name: 'Jean brut', color_name: 'Marine', color_hex: '#27324F', fit: 'Ajusté' },
  { category: 'bas', type: 'Pantalon', name: 'Pantalon de costume noir', color_name: 'Noir', color_hex: '#1E1E1E', fit: 'Regular' },
  { category: 'bas', type: 'Jogging', name: 'Jogging gris', color_name: 'Gris', color_hex: '#8C8C8C', fit: 'Ample' },
  { category: 'bas', type: 'Chino', name: 'Chino beige', color_name: 'Beige', color_hex: '#CDB892', fit: 'Regular' },
  { category: 'bas', type: 'Short', name: 'Short en lin écru', color_name: 'Écru', color_hex: '#E8E0CC', fit: 'Regular' },
  { category: 'chaussures', type: 'Baskets', name: 'Baskets blanches', color_name: 'Blanc', color_hex: '#F4F2EE', fit: 'Basses' },
  { category: 'chaussures', type: 'Ville', name: 'Derbies noires', color_name: 'Noir', color_hex: '#1E1E1E', fit: 'Basses' },
  { category: 'chaussures', type: 'Bottines', name: 'Bottines marron', color_name: 'Marron', color_hex: '#6B4A32', fit: 'Montantes' },
  { category: 'veste', type: 'Blouson', name: 'Blouson noir', color_name: 'Noir', color_hex: '#1E1E1E', fit: 'Regular' },
  { category: 'accessoire', type: 'Montre', name: 'Montre acier', color_name: 'Argent', color_hex: '#C9CCD1', fit: '' }
];
