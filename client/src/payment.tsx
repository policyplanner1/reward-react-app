import React from "react";
import axios from "axios";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment: React.FC = () => {
  const orderId = 6; 

  const handlePayment = async () => {
    try {
      // Step 1: Create order from backend
      const { data } = await axios.post(
        "https://rewardplanners.com/api/crm/payment/create-order",
        {
          orderId: orderId,
          amount: 2199,
        },
      );

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Reward Planners",
        description: "Test Payment",

        handler: async function (response: any) {
          await axios.post("https://rewardplanners.com/api/crm/payment/verify-payment", response);

          let attempts = 0;

          const checkStatus = async () => {
            const statusRes = await axios.get(
              `https://rewardplanners.com/api/crm/payment/payment-status/${orderId}`,
            );

            if (statusRes.data.status === "paid") {
              alert("Payment Successful");
              return;
            }

            attempts++;

            if (attempts < 5) {
              setTimeout(checkStatus, 2000);
            } else {
              alert(
                "Payment is being verified. Please check your orders page.",
              );
            }
          };

          checkStatus();
        },

        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed to start");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Razorpay Test Payment</h2>
      <button onClick={handlePayment} style={{ padding: "10px 20px" }}>
        Pay ₹2199
      </button>
    </div>
  );
};

export default Payment;
