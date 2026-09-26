// Release checks use local-only database guards in each integration suite.
// Providers are stubbed and integration writes roll back.
const {spawnSync}=require('node:child_process');
const suites=['test-public-checkout.cjs','test-customer-shopping-actions.cjs','test-onboarding-actions.cjs','test-workspace-upgrades.cjs','test-rex-workspace.cjs','test-website-upgrades-actions.cjs','test-creation-coupons.cjs','test-creation-coupon-actions.cjs','test-photo-studio.cjs','test-photo-studio-quota.cjs'];
for(const suite of suites){console.log('\nChecking '+suite);const result=spawnSync(process.execPath,['scripts/'+suite],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log('\nAll public release checks passed.');
