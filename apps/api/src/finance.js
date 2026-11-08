export function plannedShares(amount,shares){
 if(!Number.isSafeInteger(amount)||amount<=0||!shares||!['platform','designer','workshop'].every(k=>Number.isInteger(shares[k])&&shares[k]>=0)||Object.keys(shares).length!==3||Object.values(shares).reduce((a,b)=>a+b,0)!==100)throw Error('Invalid agreed amount or shares');
 const platform=Math.floor(amount*shares.platform/100),designer=Math.floor(amount*shares.designer/100);
 return {platform,designer,workshop:amount-platform-designer};
}
