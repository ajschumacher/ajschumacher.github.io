# Consider tax on investments

Taxes make everything more complicated. They vary based on your income
level, where you live, what investments you have, and what accounts
you have them in, and more. And they affect your real returns. Let's
compare income-generating investments.


<form id="taxForm">

<h3>A nominally <input type="number" step="any" id="nominal_rate" value="5.00" />% investment yields, after tax:</h3>

<ul>
  <li><b><span class="bignum" id="interest">3.50%</span></b> if it's regular interest from a bank, a CD, non-qualified dividends, etc.
    <ul><li><a href="https://www.irs.gov/filing/federal-income-tax-rates-and-brackets">Federal</a> and <a href="https://taxfoundation.org/data/all/state/state-income-tax-rates/">state</a> income tax apply.</li></ul>
  </li>
  <li><b><span class="bignum" id="dividend">3.75%</span></b> if it's <a href="https://www.investopedia.com/terms/q/qualifieddividend.asp">qualified dividends</a>, etc.
    <ul><li>Federal long-term <a href="https://www.irs.gov/taxtopics/tc409">capital gains</a> and state tax apply.</li></ul>
  </li>
  <li><b><span class="bignum" id="bond">4.00%</span></b> if it's interest from a US government bond, etc.
    <ul><li>Federal income tax applies, but not state tax.</li></ul>
  </li>
</ul>


<!--
<p>
<input type="submit" value="Update" />
</p>
-->

<p>
<input type="number" step="any" id="fed_rate" value=20 />
<label for="fed_rate">% Federal income tax rate</label>
</p>

<p>
<input type="number" step="any" id="gains_rate" value=15 />
<label for="gains_rate">% Federal capital gains tax rate</label>
</p>

<p>
<input type="number" step="any" id="state_rate" value=10 />
<label for="state_rate">% state income tax rate</label>
</p>

</form>


Most states don't differentiate between regular income and capital
gains, so there's just the one state tax box here. It probably makes
sense to use your overall effective (“blended”) tax rates here, though
you could use your marginal rates if you want. And of course this all
assumes we're in the US.


<style>
input { width: 4em; }
.bignum {font-size: 1.17em; }
</style>


<script>
function update_everything(e) {
  e.preventDefault();

  const fed_rate = parseFloat(document.getElementById('fed_rate').value);
  const gains_rate = parseFloat(document.getElementById('gains_rate').value);
  const state_rate = parseFloat(document.getElementById('state_rate').value);
  const nominal_rate = parseFloat(document.getElementById('nominal_rate').value);

  document.getElementById('interest').innerText = (nominal_rate * (1 - fed_rate/100 - state_rate/100)).toFixed(2) + '%';
  document.getElementById('dividend').innerText = (nominal_rate * (1 - gains_rate/100 - state_rate/100)).toFixed(2) + '%';
  document.getElementById('bond').innerText = (nominal_rate * (1 - fed_rate/100)).toFixed(2) + '%';
}

document.getElementById('taxForm').addEventListener('submit', update_everything);  // not strictly needed since removing the submit button, but hey
document.querySelectorAll('input[type="number"]').forEach(
  el => el.addEventListener('input', update_everything));
</script>
