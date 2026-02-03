import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOrders,
  toggleOrderStatus,
  deleteOrder,
} from "../../redux/admin/ordersSlice";
import { Eye, Trash2, CheckCircle, Clock, Loader2 } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Orders() {
  const dispatch = useDispatch();

  const { items, status, processingId } = useSelector(
    (state) => state.adminOrders
  );

  const [openOrder, setOpenOrder] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const formatDate = (ts) =>
    ts?.toDate ? ts.toDate().toLocaleString() : "N/A";

  return (
    <div className="admin container">
      <div className="admin__header">
        <h2>Orders</h2>
        <span className="order-count">{items.length} orders</span>
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

        {status === "loading" && (
          <div className="table-loading">
            <Loader2 className="spin" size={24} />
            Loading orders...
          </div>
        )}

        {status === "succeeded" &&
          items.map((order) => (
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
                  className="btn-main btn-sm"
                  disabled={
                    processingId === order.id ||
                    order.status === "completed"
                  }
                  onClick={() => dispatch(toggleOrderStatus(order))}
                >
                  {processingId === order.id ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                </button>

                <button
                  className="btn-light-danger btn-sm"
                  onClick={() => setDeleteModal(order.id)}
                >
                  <Trash2 size={16} />
                </button>
              </span>

              {openOrder === order.id && (
                <div className="order-details">
                  <div className="order-section">
                    <h4>Shipping Info</h4>
                    <p><strong>Name:</strong> {order.user?.name}</p>
                    <p><strong>Email:</strong> {order.user?.email}</p>
                    <p><strong>Phone:</strong> {order.user?.phone}</p>
                    <p><strong>City:</strong> {order.user?.city}</p>
                    <p><strong>Address:</strong> {order.user?.address}</p>
                  </div>

                  <div className="order-section">
                    <h4>Products</h4>
                    <div className="order-items">
                      {order.cartItems?.map((item, i) => (
                        <div key={i} className="order-item">
                          <img
                            src={item.images?.[0] || "/placeholder.png"}
                            alt={item.title}
                          />
                          <div>
                            <p className="title">{item.title}</p>
                            <p className="meta">
                              Qty: {item.quantity} • ${item.price}
                            </p>
                          </div>
                          <span className="item-total">
                            ${item.quantity * item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-footer">
                    <strong>Total:</strong>{" "}
                    <strong>${order.totalPrice}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {deleteModal && (
        <div className="admin-modal">
          <div className="modal-box small">
            <div className="modal-header danger">
              {/* <Trash2 size={24} /> */}
              <h3>Delete Order</h3>
            </div>

            <div className="modal-body">
              Are you sure you want to delete this order?
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
                onClick={() => {
                  dispatch(deleteOrder(deleteModal));
                  setDeleteModal(null);
                }}
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
