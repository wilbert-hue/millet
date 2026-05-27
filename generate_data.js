const fs = require('fs');
const path = require('path');

const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

const cities = [
  'Delhi NCR',
  'Hyderabad',
  'Bengaluru',
  'Indore',
  'Ludhiana',
  'Rest of India',
];

const cityShares = {
  'Delhi NCR': 0.22,
  Hyderabad: 0.15,
  Bengaluru: 0.18,
  Indore: 0.12,
  Ludhiana: 0.1,
  'Rest of India': 0.23,
};

// Flat segment types: segment -> share within type
const flatSegmentTypes = {
  'By Product Category': {
    'Millet Chips, Crisps & Nachos': 0.28,
    'Millet Extruded Snacks': 0.22,
    'Millet Namkeen, Sev & Savory Mixes': 0.2,
    'Millet Crackers & Savory Biscuits': 0.15,
    'Others (Millet Khakhra & Roasted Flat Snacks, Millet Cookies & Sweet Biscuits, etc.)': 0.15,
  },
  'By Millet Type': {
    'Pearl Millet': 0.24,
    'Finger Millet': 0.2,
    Sorghum: 0.18,
    'Foxtail Millet': 0.12,
    'Barnyard Millet': 0.1,
    'Little Millet': 0.08,
    'Kodo Millet': 0.05,
    'Others (Proso Millet, etc.)': 0.03,
  },
  'By Price Range': {
    'Economy (Up to ₹50 per 100 g)': 0.35,
    'Mid-Priced (₹51—₹100 per 100 g)': 0.4,
    'Premium (Above ₹100 per 100 g)': 0.25,
  },
};

// Hierarchical segment types: parent -> { child: share } or leaf with null children
const hierarchicalTopShares = {
  'By End User': {
    'Individual Household Consumers': 0.58,
    'Commercial Consumers': 0.42,
  },
  'By Distribution Channel': {
    Online: 0.38,
    Offline: 0.62,
  },
};

const hierarchicalSegmentTypes = {
  'By End User': {
    'Individual Household Consumers': null,
    'Commercial Consumers': {
      'Corporate Offices & Workplaces': 0.18,
      'Schools, Colleges & Educational Institutions': 0.14,
      HoReCa: 0.2,
      'Travel & Transit Operators': 0.1,
      'Healthcare & Wellness Institutions': 0.12,
      'Government & Institutional Nutrition Programs': 0.1,
      'Private Label Buyers': 0.08,
      'Export Buyers / Import Distributors': 0.08,
    },
  },
  'By Distribution Channel': {
    Online: {
      'E-commerce Websites': 0.62,
      'Company-Owned Websites': 0.38,
    },
    Offline: {
      'General Trade / Kirana Stores': 0.38,
      'Modern Trade / Supermarkets & Hypermarkets': 0.32,
      'Convenience Stores': 0.15,
      'Institutional / HoReCa Distributors': 0.15,
    },
  },
};

// India total market base (USD Million) in 2021
const indiaBaseValue = 92;
const indiaGrowthRate = 0.168;

const segmentGrowthMultipliers = {
  'By Product Category': {
    'Millet Chips, Crisps & Nachos': 1.12,
    'Millet Extruded Snacks': 1.15,
    'Millet Namkeen, Sev & Savory Mixes': 1.08,
    'Millet Crackers & Savory Biscuits': 1.05,
    'Others (Millet Khakhra & Roasted Flat Snacks, Millet Cookies & Sweet Biscuits, etc.)': 1.1,
  },
  'By Millet Type': {
    'Pearl Millet': 1.06,
    'Finger Millet': 1.1,
    Sorghum: 1.04,
    'Foxtail Millet': 1.14,
    'Barnyard Millet': 1.12,
    'Little Millet': 1.16,
    'Kodo Millet': 1.08,
    'Others (Proso Millet, etc.)': 1.18,
  },
  'By Price Range': {
    'Economy (Up to ₹50 per 100 g)': 0.95,
    'Mid-Priced (₹51—₹100 per 100 g)': 1.08,
    'Premium (Above ₹100 per 100 g)': 1.2,
  },
  'By End User': {
    'Individual Household Consumers': 1.1,
    'Commercial Consumers': 1.14,
    'Corporate Offices & Workplaces': 1.12,
    'Schools, Colleges & Educational Institutions': 1.18,
    HoReCa: 1.15,
    'Travel & Transit Operators': 1.2,
    'Healthcare & Wellness Institutions': 1.08,
    'Government & Institutional Nutrition Programs': 1.22,
    'Private Label Buyers': 1.16,
    'Export Buyers / Import Distributors': 1.25,
  },
  'By Distribution Channel': {
    Online: 1.22,
    Offline: 0.96,
    'E-commerce Websites': 1.25,
    'Company-Owned Websites': 1.18,
    'General Trade / Kirana Stores': 0.94,
    'Modern Trade / Supermarkets & Hypermarkets': 1.05,
    'Convenience Stores': 1.1,
    'Institutional / HoReCa Distributors': 1.12,
  },
};

const volumePerMillionUSD = 520;

let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    series[year] = roundFn(addNoise(baseValue * Math.pow(1 + growthRate, i)));
  }
  return series;
}

function getGrowthMultiplier(segType, segName) {
  const typeMap = segmentGrowthMultipliers[segType];
  if (typeMap && typeMap[segName] !== undefined) return typeMap[segName];
  return 1;
}

function buildFlatSegments(segType, segments, baseValue, growthRate, roundFn) {
  const result = {};
  for (const [segName, share] of Object.entries(segments)) {
    const segGrowth = growthRate * getGrowthMultiplier(segType, segName);
    const segBase = baseValue * share;
    result[segName] = generateTimeSeries(segBase, segGrowth, roundFn);
  }
  return result;
}

function buildHierarchicalSegments(segType, tree, baseValue, growthRate, roundFn) {
  const result = {};
  const topShares = hierarchicalTopShares[segType] || {};

  for (const [name, children] of Object.entries(tree)) {
    const parentShare = topShares[name] ?? 1 / Object.keys(tree).length;
    const parentBase = baseValue * parentShare;
    const parentGrowth = growthRate * getGrowthMultiplier(segType, name);

    if (children === null) {
      result[name] = generateTimeSeries(parentBase, parentGrowth, roundFn);
    } else {
      result[name] = {};
      const childWeight = Object.values(children).reduce((a, b) => a + b, 0);
      for (const [childName, childShare] of Object.entries(children)) {
        const childGrowth = parentGrowth * getGrowthMultiplier(segType, childName);
        const childBase = parentBase * (childShare / childWeight);
        result[name][childName] = generateTimeSeries(childBase, childGrowth, roundFn);
      }
    }
  }
  return result;
}

function buildAllSegmentTypes(baseValue, growthRate, roundFn) {
  const geoData = {};

  for (const [segType, segments] of Object.entries(flatSegmentTypes)) {
    geoData[segType] = buildFlatSegments(segType, segments, baseValue, growthRate, roundFn);
  }

  for (const [segType, tree] of Object.entries(hierarchicalSegmentTypes)) {
    geoData[segType] = buildHierarchicalSegments(segType, tree, baseValue, growthRate, roundFn);
  }

  // Geography breakdown under India (for city-level selection in UI)
  geoData['By Region'] = {
    India: {},
  };
  for (const city of cities) {
    const cityShare = cityShares[city];
    const cityGrowth = growthRate * (1 + (seededRandom() - 0.5) * 0.05);
    geoData['By Region'].India[city] = generateTimeSeries(
      baseValue * cityShare,
      cityGrowth,
      roundFn
    );
  }

  return geoData;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;
  const indiaBase = indiaBaseValue * multiplier;
  const growth = indiaGrowthRate;

  // National India
  data.India = buildAllSegmentTypes(indiaBase, growth, roundFn);

  // City-level geographies
  for (const city of cities) {
    const cityShare = cityShares[city];
    const cityGrowth = growth * (1 + (seededRandom() - 0.5) * 0.04);
    const cityBase = indiaBase * cityShare;
    data[city] = buildAllSegmentTypes(cityBase, cityGrowth, roundFn);
  }

  return data;
}

function buildSegmentationStructure() {
  const structure = { India: {} };

  for (const [segType, segments] of Object.entries(flatSegmentTypes)) {
    structure.India[segType] = {};
    for (const segName of Object.keys(segments)) {
      structure.India[segType][segName] = {};
    }
  }

  for (const [segType, tree] of Object.entries(hierarchicalSegmentTypes)) {
    structure.India[segType] = {};
    for (const [parent, children] of Object.entries(tree)) {
      if (children === null) {
        structure.India[segType][parent] = {};
      } else {
        structure.India[segType][parent] = {};
        for (const child of Object.keys(children)) {
          structure.India[segType][parent][child] = {};
        }
      }
    }
  }

  structure.India['By Region'] = {
    India: {},
  };
  for (const city of cities) {
    structure.India['By Region'].India[city] = {};
  }

  return structure;
}

seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);
const segmentationData = buildSegmentationStructure();

const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));
fs.writeFileSync(
  path.join(outDir, 'segmentation_analysis.json'),
  JSON.stringify(segmentationData, null, 2)
);

console.log('Generated value.json, volume.json, and segmentation_analysis.json');
console.log('Geographies:', Object.keys(valueData).join(', '));
console.log('Segment types (India):', Object.keys(valueData.India).join(', '));
