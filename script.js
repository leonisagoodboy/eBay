
    // 全域變數存放 API 取得的數據
    let currentExchangeRate = null;
    let currentFuelSurchargePercent = null;

    // 取得匯率資料：使用 ExchangeRate-API (以 USD 為基底)
    function fetchExchangeRate() {
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(response => response.json())
        .then(data => {
          currentExchangeRate = data.rates.TWD;
          document.getElementById('exchangeRate').value = currentExchangeRate.toFixed(2);
        })
        .catch(error => {
          console.error('獲取匯率失敗:', error);
          currentExchangeRate = 30;
          document.getElementById('exchangeRate').value = currentExchangeRate.toFixed(2);
        });
    }

    // 取得燃油附加費：此為範例 API，請替換為正確 API 端點與金鑰
    function fetchFuelSurcharge() {
      fetch('https://api.example.com/fuel-price')
        .then(response => response.json())
        .then(data => {
          currentFuelSurchargePercent = data.fuelSurchargePercent;
          document.getElementById('fuelSurcharge').value = currentFuelSurchargePercent.toFixed(1);
        })
        .catch(error => {
          console.error('獲取燃油附加費失敗:', error);
          currentFuelSurchargePercent = 0;
          document.getElementById('fuelSurcharge').value = currentFuelSurchargePercent.toFixed(1);
        });
    }

    // 當頁面載入時自動呼叫 API
    window.addEventListener('load', function(){
      fetchExchangeRate();
      fetchFuelSurcharge();
    });

    /* 定義各國運費參數（參考較現實報價，僅供參考） */
    const shippingRates = {
      germany: { threshold1: 0.45, cost1: 12, threshold2: 0.9, cost2: 15, baseCost: 18, incremental: 12 },
      usa:     { threshold1: 0.45, cost1: 10, threshold2: 0.9, cost2: 13, baseCost: 17, incremental: 11 },
      japan:   { threshold1: 0.45, cost1: 14, threshold2: 0.9, cost2: 18, baseCost: 20, incremental: 12 },
      canada:  { threshold1: 0.45, cost1: 13, threshold2: 0.9, cost2: 16, baseCost: 19, incremental: 12 },
      uk:      { threshold1: 0.45, cost1: 11, threshold2: 0.9, cost2: 14, baseCost: 18, incremental: 10 },
      france:  { threshold1: 0.45, cost1: 11, threshold2: 0.9, cost2: 14, baseCost: 18, incremental: 10 },
      italy:   { threshold1: 0.45, cost1: 11, threshold2: 0.9, cost2: 14, baseCost: 18, incremental: 10 }
    };

    /* 定義各國進口稅率規則 */
    const taxRates = {
      germany: 0.19,
      usa: 0,
      japan: 0.10,
      canada: 0.15,
      uk: 0.20,
      france: 0.20,
      italy: 0.22
    };

    // 計算運費與費用
    function calculateShipping() {
      const length = parseFloat(document.getElementById('length').value);
      const width = parseFloat(document.getElementById('width').value);
      const height = parseFloat(document.getElementById('height').value);
      const weight = parseFloat(document.getElementById('weight').value);
      const price = parseFloat(document.getElementById('price').value);
      const destination = document.getElementById('destination').value;
      const insuranceChecked = document.getElementById('insurance').checked;
      const taxByBuyer = document.getElementById('taxByBuyer').checked;

      if (!length || !width || !height || !weight || !price || !destination) {
        alert('請填寫所有必填欄位！');
        return;
      }
      if (!currentExchangeRate) {
        alert('匯率資料尚未獲取，請稍後再試！');
        return;
      }

      const volume = length * width * height;
      const volumetricWeight = volume / 5000;
      const billingWeight = Math.max(weight, volumetricWeight);

      const taxRate = (taxRates[destination] !== undefined) ? taxRates[destination] : 0.1;
      let tax = price * taxRate;
      if (taxByBuyer) {
        tax = 0;
      }

      const rates = shippingRates[destination] || { threshold1: 0.45, cost1: 15, threshold2: 0.9, cost2: 20, baseCost: 20, incremental: 10 };
      let shippingCostUSD;
      if (billingWeight <= rates.threshold1) {
        shippingCostUSD = rates.cost1;
      } else if (billingWeight <= rates.threshold2) {
        shippingCostUSD = rates.cost2;
      } else {
        shippingCostUSD = rates.baseCost + (billingWeight - rates.threshold2) * rates.incremental;
      }

      let fuelAdjustment = 1;
      if (currentFuelSurchargePercent) {
        fuelAdjustment = 1 + currentFuelSurchargePercent / 100;
      }
      let shippingCostUSDAdjusted = shippingCostUSD * fuelAdjustment;
      const shippingCostTWD = shippingCostUSDAdjusted * currentExchangeRate;

      const transactionFee = price * 0.129;
      const internationalFee = price * 0.013;
      const domesticShipping = 120;
      const packaging = 50;
      let insuranceFee = insuranceChecked ? price * 0.005 : 0;

      const totalCost = shippingCostTWD + transactionFee + internationalFee + domesticShipping + packaging + tax + insuranceFee;
      const finalAmount = price - totalCost;

      const fluctuation = price * 0.01;
      const minAmount = finalAmount - fluctuation;
      const maxAmount = finalAmount + fluctuation;

      let resultHTML = `
        <p><strong>體積（立方厘米）:</strong> ${volume.toFixed(2)}</p>
        <p><strong>體積重量（kg）:</strong> ${volumetricWeight.toFixed(2)}</p>
        <p><strong>計費重量（kg）:</strong> ${billingWeight.toFixed(2)}</p>
        <p><strong>國際運費（美元，含燃油附加費）:</strong> ${shippingCostUSDAdjusted.toFixed(2)}</p>
        <p><strong>國際運費（新台幣）:</strong> ${shippingCostTWD.toFixed(2)}</p>
        <p><strong>成交手續費（新台幣）:</strong> ${transactionFee.toFixed(2)}</p>
        <p><strong>國際交易費（新台幣）:</strong> ${internationalFee.toFixed(2)}</p>
        <p><strong>國內運費+包裝（新台幣）:</strong> ${(domesticShipping + packaging).toFixed(2)}</p>
        <p><strong>進口稅費（新台幣）:</strong> ${tax.toFixed(2)}</p>
        <p><strong>包裹保險費（新台幣）:</strong> ${insuranceFee.toFixed(2)}</p>
        <p><strong>總成本（新台幣）:</strong> ${totalCost.toFixed(2)}</p>
        <p class="final-amount">最終到手金額（新台幣）: <strong>${finalAmount.toFixed(2)}</strong></p>
        <p><strong>考慮匯率波動後範圍（新台幣）:</strong> ${minAmount.toFixed(2)} - ${maxAmount.toFixed(2)}</p>
      `;
      if (finalAmount < 0) {
        resultHTML += `<p class="warning">警告：最終到手金額為負數，請調整售價或成本！</p>`;
      }
      document.getElementById('result').innerHTML = resultHTML;
    }

    // Modal 控制函式
    function openModal() {
      document.getElementById('rulesModal').style.display = 'block';
    }
    function closeModal() {
      document.getElementById('rulesModal').style.display = 'none';
    }
    // 當點擊視窗其他區域時，關閉 Modal
    window.onclick = function(event) {
      const modal = document.getElementById('rulesModal');
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    }
