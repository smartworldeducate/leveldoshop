import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [openOrder, setOpenOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, "order"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const ordersArray = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(ordersArray);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return "N/A";
    return timestamp.toDate().toLocaleDateString() + " " + timestamp.toDate().toLocaleTimeString();
  };

  return (
    <div className="admin container">
      <div className="admin__header">
        <h2>Orders</h2>
        <span className="order-count">{orders.length} orders</span>
      </div>

      <div className="admin__table orders-table">
        <div className="table-head">
          <span>Order ID</span>
          <span>Customer</span>
          <span>Email</span>
          <span>Phone</span>
          <span>City</span>
          <span>Total</span>
          <span>Date</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {orders.map(order => (
          <div key={order.id} className="table-row">
            <span className="mono">#{order.id.slice(0, 6)}</span>
            <span>{order.user?.name || "N/A"}</span>
            <span>{order.user?.email || "N/A"}</span>
            <span>{order.user?.phone || "N/A"}</span>
            <span>{order.user?.city || "N/A"}</span>
            <span>${order.totalPrice}</span>
            <span>{formatDate(order.createdAt)}</span>
            <span><span className="badge success">Completed</span></span>
            <span>
              <button
                className="btn-outline btn-sm"
                onClick={() => setOpenOrder(openOrder === order.id ? null : order.id)}
              >
                View
              </button>
            </span>

            {openOrder === order.id && (
              <div className="order-details">
                <div className="order-section">
                  <h4>Shipping Info</h4>
                  <p><strong>Name:</strong> {order.user?.name || "N/A"}</p>
                  <p><strong>Email:</strong> {order.user?.email || "N/A"}</p>
                  <p><strong>Phone:</strong> {order.user?.phone || "N/A"}</p>
                  <p><strong>City:</strong> {order.user?.city || "N/A"}</p>
                  <p><strong>Address:</strong> {order.user?.address || "N/A"}</p>
                </div>

                <div className="order-section">
                  <h4>Products</h4>
                  <div className="order-items">
                    {order.cartItems?.map((item, i) => (
                      <div key={i} className="order-item">
                        <img
                          src={item.images?.[0] || "/placeholder.png"}
                          alt={item.title || "Product Image"}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '8px' }}
                        />
                        <div>
                          <p className="title">{item.title || "Product"}</p>
                          <p className="meta">Qty: {item.quantity} • ${item.price}</p>
                        </div>
                        <span className="item-total">
                          ${Number(item.quantity) * Number(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="order-footer">
                  <strong>Total:</strong> <strong>${order.totalPrice}</strong>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

Orders.getLayout = page => <AdminLayout>{page}</AdminLayout>;
