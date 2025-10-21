const { execSync } = require('child_process');

try {
  console.log('Testing TypeScript compilation...');
  execSync('npx tsc --noEmit --skipLibCheck', { 
    stdio: 'pipe',
    cwd: __dirname 
  });
  console.log('✅ Build successful!');
} catch (error) {
  const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
  const lines = output.split('\n');
  const errorLines = lines.filter(line => line.includes('error TS'));
  
  console.log(`❌ Found ${errorLines.length} TypeScript errors:`);
  errorLines.slice(0, 20).forEach(line => console.log(line.trim()));
  
  if (errorLines.length > 20) {
    console.log(`... and ${errorLines.length - 20} more errors`);
  }
}