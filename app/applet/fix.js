const fs = require('fs');
let content = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

content = content.replace(/\{substance\.activeIngredientName && calculateActiveIngredient\(sDoses, substance\) > 0 && \(\s*<span className="text-\[10px\] font-bold text-md3-primary">\s*\{calculateActiveIngredient\(sDoses, substance\)\.toFixed\(2\)\}\{substance\.unit\} \{substance\.activeIngredientName\}\s*<\/span>\s*\)\}/g, 
  `{renderActiveIngredientsString(sDoses, substance) && (
                                  <span className="text-[10px] font-bold text-md3-primary">
                                    {renderActiveIngredientsString(sDoses, substance)}
                                  </span>
                                )}`);

content = content.replace(/\{substance\.activeIngredientName && calculateActiveIngredient\(\[dose\], substance\) > 0 && \(\s*<div className="text-\[10px\] font-bold text-md3-primary">\s*\{calculateActiveIngredient\(\[dose\], substance\)\.toFixed\(2\)\}\{substance\.unit\} \{substance\.activeIngredientName\}\s*<\/div>\s*\)\}/g,
  `{renderActiveIngredientsString([dose], substance) && (
                                    <div className="text-[10px] font-bold text-md3-primary mt-0.5">
                                      {renderActiveIngredientsString([dose], substance)}
                                    </div>
                                  )}`);

content = content.replace(/\{substance\.activeIngredientName && calculateActiveIngredient\(sDoses, substance\) > 0 && \(\s*<div className="text-xs font-bold text-md3-primary mt-1">\s*\{calculateActiveIngredient\(sDoses, substance\)\.toFixed\(2\)\}\{substance\.unit\} \{substance\.activeIngredientName\}\s*<\/div>\s*\)\}/g,
  `{renderActiveIngredientsString(sDoses, substance) && (
                    <div className="text-xs font-bold text-md3-primary mt-1">
                      {renderActiveIngredientsString(sDoses, substance)}
                    </div>
                  )}`);

content = content.replace(/\{substance\.activeIngredientName && sDoses\.length > 0 && calculateActiveIngredient\(sDoses, substance\) > 0 && \(\s*<div className="text-xs font-bold text-md3-primary mt-1">\s*\{\(calculateActiveIngredient\(sDoses, substance\) \/ sDoses\.length\)\.toFixed\(2\)\}\{substance\.unit\} \{substance\.activeIngredientName\}\s*<\/div>\s*\)\}/g,
`{(function(){
                    if (sDoses.length === 0) return null;
                    const ingrs = calculateActiveIngredients(sDoses, substance);
                    const entries = Object.entries(ingrs).filter(([, val]) => val > 0);
                    if (entries.length === 0) return null;
                    return (
                      <div className="text-xs font-bold text-md3-primary mt-1">
                        {entries.map(([n,v]) => \`\${(v / sDoses.length).toFixed(2)}\${substance.unit} \${n}\`).join(' + ')}
                      </div>
                    );
                  })()}`);

content = content.replace(/\{substance\.activeIngredientName && sDoses\.length > 0 && Math\.max\(\.\.\.sDoses\.map\(d => calculateActiveIngredient\(\[d\], substance\)\)\) > 0 && \(\s*<div className="text-xs font-bold text-md3-primary mt-1">\s*\{Math\.max\(\.\.\.sDoses\.map\(d => calculateActiveIngredient\(\[d\], substance\)\)\)\.toFixed\(2\)\}\{substance\.unit\} \{substance\.activeIngredientName\}\s*<\/div>\s*\)\}/g,
`{(function(){
                    if (sDoses.length === 0) return null;
                    const sumMap = sDoses.map(d => ({ d, total: Object.values(calculateActiveIngredients([d], substance)).reduce((a,b)=>a+b,0) }));
                    const maxDoseObj = sumMap.sort((a,b) => b.total - a.total)[0]?.d;
                    if (!maxDoseObj) return null;
                    const str = renderActiveIngredientsString([maxDoseObj], substance);
                    if (!str) return null;
                    return (
                      <div className="text-xs font-bold text-md3-primary mt-1">
                        {str}
                      </div>
                    );
                  })()}`);

content = content.replace(/\{substance\.activeIngredientName && calculateActiveIngredient\(group\.doses, substance\) > 0 && \(\s*<span className="text-\[10px\] font-bold text-md3-primary mt-1">\s*\{calculateActiveIngredient\(group\.doses, substance\)\.toFixed\(2\)\}\{substance\.unit\} \{substance\.activeIngredientName\}\s*<\/span>\s*\)\}/g,
`{renderActiveIngredientsString(group.doses, substance) && (
                            <span className="text-[10px] font-bold text-md3-primary mt-1 block">
                              {renderActiveIngredientsString(group.doses, substance)}
                            </span>
                          )}`);

// Active Ingredients Analytics Tab
content = content.replace(/const totalActiveAmount = calculateActiveIngredient\(sDoses, substance\);/g, 
  `const activeSums = calculateActiveIngredients(sDoses, substance);
                   const totalActiveAmount = Object.values(activeSums).reduce((a,b)=>a+b,0);`);

content = content.replace(/monthlyData\[month\]\.active \+= calculateActiveIngredient\(\[d\], substance\);/g,
  `monthlyData[month].active += Object.values(calculateActiveIngredients([d], substance)).reduce((a,b)=>a+b,0);`);

content = content.replace(/Analýza účinné látky: \{substance\.activeIngredientName\}/g,
  `Analýza účinných látek`);

// Sub-tabs: we should make sure that if a substance has multiple active ingredients, the tab is not hidden.
content = content.replace(/detailTab === 'active-ingredients' && substance\.activeIngredientName/g,
  `detailTab === 'active-ingredients' && (substance.activeIngredientName || (substance.activeIngredients && substance.activeIngredients.length > 0))`);

content = content.replace(/disabled=\{\!substance\.activeIngredientName\}/g,
  `disabled={!substance.activeIngredientName && (!substance.activeIngredients || substance.activeIngredients.length === 0)}`);

fs.writeFileSync('src/components/Analytics.tsx', content);
console.log('done');
