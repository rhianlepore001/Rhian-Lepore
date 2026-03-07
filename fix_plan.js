const fs = require('fs');
const plan = JSON.parse(fs.readFileSync('testsprite_tests/testsprite_frontend_test_plan.json', 'utf8'));

const gatewayStep = {
  type: 'action',
  description: 'Click the "Barbearia" card/button on the gateway screen to proceed to the login form'
};

let fixed = 0;
plan.forEach(tc => {
  const navIdx = tc.steps.findIndex(s =>
    s.type === 'action' &&
    s.description.includes('Navigate to /login')
  );

  if (navIdx !== -1) {
    const nextStep = tc.steps[navIdx + 1];
    const alreadyHasGateway = nextStep && nextStep.description.toLowerCase().includes('barbearia');
    if (!alreadyHasGateway) {
      tc.steps.splice(navIdx + 1, 0, gatewayStep);
      fixed++;
      console.log('Fixed: ' + tc.id);
    }
  }
});

fs.writeFileSync('testsprite_tests/testsprite_frontend_test_plan.json', JSON.stringify(plan, null, 2));
console.log('\nTotal fixed: ' + fixed + ' test cases');
