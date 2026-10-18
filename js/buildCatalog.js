function buildCatalog(data) {
  BRANDS = data.brands.map(b => ({ ...b, count: 0 }));
  
  // Create a brand lookup map by name
  const brandMap = new Map(BRANDS.map(b => [b.brand, b]));

  P = data.polishes.map((r, index) => {
    // Handle both object format from CSV export or array format from legacy catalog
    const brandName = typeof r.brand === 'string' ? r.brand : BRANDS[r[1]]?.name;
    const brand = brandMap.get(brandName) || { name: brandName, bottle: 15 };
    brand.count++;

    // Helper to parse comma-separated lists into arrays
    const parseList = val => (val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : []);

    const p = {
      id: r.id || r[0] || (10000 + index),
      brand,
      name: r.name || r[2],
      collection: r.collection || r[3] || null,
      year: r.release_year || r[4] || null,
      base: parseList(r.base_color || r[5]),
      other: parseList(r.other_colors || r[6]),
      finishes: parseList(r.finish || r[7]),
      ctype: r.collection_type || r[8] || null,
      price: r.price != null ? parseFloat(r.price) : (r[9] != null ? r[9] : null),
      stock: (r.stock_status === 'In Stock' || r[12] === 'In stock' || r[11] === 1) ? 1 : 0,
      pstatus: r.status || r[12] || 'reg',
      image: r.image_urls ? r.image_urls.split(',')[0].trim() : (r[13] || null),
      url: r.url || r[14] || null,
      dupes: r.dupes ? String(r.dupes).split(',').map(Number) : (r[15] || []),
      month: r.release_month || r[16] || null
    };
    
    p.search = foldKey(`${brand.name} ${p.name} ${p.collection || ""}`);
    p.ppm = p.price && brand.bottle_size ? p.price / brand.bottle_size : null;
    p.key = pkey(p);
    return p;
  });

  BY_ID = new Map(P.map(p => [p.id, p]));
  BY_KEY = new Map(P.map(p => [p.key, p]));
}