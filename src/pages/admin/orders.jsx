import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Eye, Trash2, CheckCircle, Clock, Loader2 } from "lucide-react";
import { db } from "../../lib/firebaseClient";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [openOrder, setOpenOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "order"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      setOrders(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleStatus = async (order) => {
    try {
      setProcessingId(order.id);
      const newStatus = order.status === "completed" ? "pending" : "completed";

      await updateDoc(doc(db, "order", order.id), { status: newStatus });

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const deleteOrder = async () => {
    try {
      setProcessingId(deleteModal);
      await deleteDoc(doc(db, "order", deleteModal));
      setOrders((prev) => prev.filter((o) => o.id !== deleteModal));
      setDeleteModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (ts) =>
    ts?.toDate ? ts.toDate().toLocaleString() : "N/A";

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

        {loading && (
          <div className="table-loading">
            <Loader2 className="spin" size={24} />
            Loading orders...
          </div>
        )}

        {!loading &&
          orders.map((order) => (
            <div key={order.id} className="table-row">
              <span className="mono">#{order.id.slice(0, 6)}</span>
              <span>{order.user?.name || "N/A"}</span>
              <span>{order.user?.email || "N/A"}</span>
              <span>{order.user?.phone || "N/A"}</span>
              <span>{order.user?.city || "N/A"}</span>
              <span className="price">${order.totalPrice}</span>
              <span>{formatDate(order.createdAt)}</span>

              <span
                className={`badge ${
                  order.status === "completed" ? "success" : "pending"
                }`}
              >
                {order.status === "completed" ? (
                  <CheckCircle size={14} />
                ) : (
                  <Clock size={14} />
                )}
                {order.status || "pending"}
              </span>

              <span className="actions">
                <button
                  className="btn-outline btn-sm"
                  onClick={() =>
                    setOpenOrder(openOrder === order.id ? null : order.id)
                  }
                >
                  <Eye size={16} />
                </button>

                <button
                  className="btn-main btn-sm "
                  disabled={processingId === order.id}
                  onClick={() => toggleStatus(order)}
                >
                  {processingId === order.id ? (
                    <Loader2 className="spin" size={16} />
                  ) : order.status === "completed" ? (
                    <CheckCircle size={16} />
                  ) : (
                    <Clock size={16} />
                  )}
                </button>

                <button
                  className="btn-danger btn-sm"
                  onClick={() => setDeleteModal(order.id)}
                >
                  <Trash2 size={16} />
                </button>
              </span>

              {openOrder === order.id && (
                <div className="order-details">
                  <div className="order-section">
                    <h4>Shipping Info</h4>
                    <p>
                      <strong>Name:</strong> {order.user?.name || "N/A"}
                    </p>
                    <p>
                      <strong>Email:</strong> {order.user?.email || "N/A"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {order.user?.phone || "N/A"}
                    </p>
                    <p>
                      <strong>City:</strong> {order.user?.city || "N/A"}
                    </p>
                    <p>
                      <strong>Address:</strong> {order.user?.address || "N/A"}
                    </p>
                  </div>

                  <div className="order-section">
                    <h4>Products</h4>
                    <div className="order-items">
                      {order.cartItems?.map((item, i) => (
                        <div key={i} className="order-item">
                          <img
                            src={item.images?.[0] || "/placeholder.png"}
                            alt={item.title || "Product Image"}
                          />
                          <div>
                            <p className="title">{item.title || "Product"}</p>
                            <p className="meta">
                              Qty: {item.quantity} • ${item.price}
                            </p>
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

      {/* DELETE MODAL */}
      {deleteModal && (
        <div className="admin-modal">
          <div className="modal-box small">
            <div className="modal-header danger">
              <div className="modal-title">
                <Trash2 size={24} color="#f06565" />
                <div>
                  <h3>Delete Order</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="modal-body">
              Are you sure you want to permanently delete this order?
            </div>

            <div className="modal-footer">
              <button
                className="btn-outline"
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </button>

              <button
                className="btn-danger"
                disabled={processingId === deleteModal}
                onClick={deleteOrder}
              >
                {processingId === deleteModal ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  "Delete Order"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Orders.getLayout = (page) => <AdminLayout>{page}</AdminLayout>;
