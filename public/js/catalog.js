// Demo catalog. Every brand, product, price and halal label here is invented
// sample data for the hackathon demo. None of it describes a real product.

export const DEMO_NOTICE =
  'Demo store: products, prices and halal labels are sample data, not real products or real certifications.';

// halal: 'labelled' = carries a demo halal label, 'unlabelled' = no halal label in the demo data.
// Face shade hexes are set in CIELCh around skin colours the YouCam tone analyzer actually
// returns for phone selfies (L 54-64, chroma ~21), so a match means a match in the photo.
export const products = [
  {
    id: 'kain-matte',
    name: 'Kain Velvet Matte Lip Cream',
    brand: 'Sampel Kain',
    category: 'lips',
    price: 59000,
    halal: 'labelled',
    blurb: 'Soft-blur matte that stays comfortable through a long day.',
    finish: { texture: 'matte', colorIntensity: 80 },
    shades: [
      { id: 'bata', name: 'Bata', hex: '#A0453A' },
      { id: 'mawar-tua', name: 'Mawar Tua', hex: '#9E4B5B' },
      { id: 'nude-kayu', name: 'Nude Kayu', hex: '#B07A6A' },
      { id: 'merah-cabe', name: 'Merah Cabe', hex: '#B0202A' },
    ],
  },
  {
    id: 'senja-satin',
    name: 'Senja Satin Lipstick',
    brand: 'Sampel Senja',
    category: 'lips',
    price: 75000,
    halal: 'labelled',
    blurb: 'Satin bullet with a soft sheen, from coral to deep plum.',
    finish: { texture: 'satin', colorIntensity: 75 },
    shades: [
      { id: 'senja', name: 'Senja', hex: '#C0574A' },
      { id: 'teh-tarik', name: 'Teh Tarik', hex: '#9A6050' },
      { id: 'plum', name: 'Plum', hex: '#6E2A3E' },
      { id: 'fuchsia', name: 'Fuchsia', hex: '#B5306E' },
    ],
  },
  {
    id: 'embun-tint',
    name: 'Embun Glow Lip Tint',
    brand: 'Sampel Embun',
    category: 'lips',
    price: 45000,
    halal: 'labelled',
    blurb: 'Sheer, glossy tint for an everyday flush of colour.',
    finish: { texture: 'gloss', colorIntensity: 60, gloss: 60, transparencyIntensity: 40 },
    shades: [
      { id: 'persik', name: 'Persik', hex: '#E58A74' },
      { id: 'jambu', name: 'Jambu', hex: '#D9637A' },
      { id: 'ceri', name: 'Ceri', hex: '#A3243A' },
    ],
  },
  {
    id: 'studio-classic',
    name: 'Studio Classic Lipstick',
    brand: 'Sampel Studio',
    category: 'lips',
    price: 89000,
    halal: 'unlabelled',
    blurb: 'Creamy classic bullet. No halal label in the demo data.',
    finish: { texture: 'satin', colorIntensity: 85 },
    shades: [
      { id: 'crimson', name: 'Crimson', hex: '#9B1B30' },
      { id: 'rosewood', name: 'Rosewood', hex: '#A8616A' },
      { id: 'mauve', name: 'Mauve', hex: '#9A5C6E' },
    ],
  },
  {
    id: 'selaras-tint',
    name: 'Selaras Skin Tint',
    brand: 'Sampel Selaras',
    category: 'face',
    price: 98000,
    halal: 'labelled',
    blurb: 'Light, dewy coverage that lets skin show through.',
    finish: { colorIntensity: 45, glowIntensity: 55, coverageIntensity: 30 },
    shades: [
      { id: 'gading', name: '01 Kuning Gading', hex: '#CAAB91' },
      { id: 'langsat', name: '02 Kuning Langsat', hex: '#BC9A7F' },
      { id: 'sawo-muda', name: '03 Sawo Muda', hex: '#AF8D70' },
      { id: 'sawo-matang', name: '04 Sawo Matang', hex: '#A27F62' },
      { id: 'cokelat', name: '05 Cokelat', hex: '#906E52' },
      { id: 'kopi', name: '06 Kopi', hex: '#7D5D43' },
    ],
  },
  {
    id: 'seri-serum',
    name: 'Seri Serum Foundation',
    brand: 'Sampel Seri',
    category: 'face',
    price: 129000,
    halal: 'labelled',
    blurb: 'Medium buildable coverage with a natural satin finish.',
    finish: { colorIntensity: 60, glowIntensity: 35, coverageIntensity: 55 },
    shades: [
      { id: 'n10', name: 'N10 Porcelain Neutral', hex: '#CBAA94' },
      { id: 'w15', name: 'W15 Ivory Warm', hex: '#C4A286' },
      { id: 'n20', name: 'N20 Light Neutral', hex: '#BD9982' },
      { id: 'w25', name: 'W25 Light Warm', hex: '#B49275' },
      { id: 'c30', name: 'C30 Natural Cool', hex: '#B38A76' },
      { id: 'w35', name: 'W35 Honey Warm', hex: '#A88565' },
      { id: 'n40', name: 'N40 Tan Neutral', hex: '#A37C60' },
      { id: 'w50', name: 'W50 Caramel Warm', hex: '#947051' },
      { id: 'n60', name: 'N60 Deep Neutral', hex: '#856048' },
    ],
  },
  {
    id: 'teduh-cushion',
    name: 'Teduh Matte Cushion',
    brand: 'Sampel Teduh',
    category: 'face',
    price: 115000,
    halal: 'labelled',
    blurb: 'Full-coverage matte cushion for humid days.',
    finish: { colorIntensity: 70, glowIntensity: 10, coverageIntensity: 75 },
    shades: [
      { id: 'ivory', name: '11 Ivory', hex: '#C8A88F' },
      { id: 'beige', name: '21 Beige', hex: '#BC9A81' },
      { id: 'pasir', name: '23 Pasir', hex: '#B28F75' },
      { id: 'madu', name: '31 Madu', hex: '#A58265' },
      { id: 'kayu', name: '41 Kayu Manis', hex: '#977256' },
      { id: 'sawo', name: '51 Sawo', hex: '#876349' },
    ],
  },
  {
    id: 'studio-hd',
    name: 'Studio HD Foundation',
    brand: 'Sampel Studio',
    category: 'face',
    price: 179000,
    halal: 'unlabelled',
    blurb: 'Long-wear foundation. No halal label in the demo data.',
    finish: { colorIntensity: 65, glowIntensity: 25, coverageIntensity: 65 },
    shades: [
      { id: 'fair', name: '110 Fair', hex: '#C6A58D' },
      { id: 'light', name: '210 Light', hex: '#B6957C' },
      { id: 'medium', name: '310 Medium', hex: '#AC8A70' },
      { id: 'tan', name: '410 Tan', hex: '#9E7A5E' },
      { id: 'deep', name: '510 Deep', hex: '#8C684E' },
    ],
  },
];

export function findShade(productId, shadeId) {
  const product = products.find((p) => p.id === productId);
  const shade = product?.shades.find((s) => s.id === shadeId);
  return product && shade ? { product, shade } : null;
}

// Builds the YouCam makeup-vto effect for one catalog shade. Server-side code uses
// this so the API key can only ever render shades that exist in the catalog.
export function effectFor(product, shade) {
  if (product.category === 'lips') {
    return {
      category: 'lip_color',
      shape: { name: 'original' },
      style: { type: 'full' },
      palettes: [{ color: shade.hex, ...product.finish }],
    };
  }
  return { category: 'foundation', palettes: [{ color: shade.hex, ...product.finish }] };
}

export function formatRupiah(n) {
  return 'Rp' + n.toLocaleString('id-ID');
}
