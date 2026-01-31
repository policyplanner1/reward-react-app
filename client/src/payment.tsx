import React from "react";
import axios from "axios";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment: React.FC = () => {
  const handlePayment = async () => {
    try {
      // Step 1: Create order from backend
      const { data } = await axios.post(
        "http://localhost:5000/payment/create-order",
        {
          orderId: 101,
          amount: 300,
        }
      );

      // Step 2: Razorpay options
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Reward Planners",
        description: "Test Payment",
        handler: async function (response: any) {
          // Step 3: Verify payment
          await axios.post(
            "http://localhost:5000/payment/verify-payment",
            response
          );

          alert("Payment Successful");
        },
        theme: {
          color: "#3399cc",
        },
      };

      // Step 4: Open Razorpay
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
        Pay ₹300
      </button>
    </div>
  );
};

export default Payment;
