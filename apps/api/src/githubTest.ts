async function fetchGithub() {
  const res = await fetch('https://api.github.com/repos/VaikulGandlwar/attendx/actions/runs', {
    headers: { 'User-Agent': 'SEQA-App' }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data).slice(0, 500));
}
fetchGithub().catch(console.error);
