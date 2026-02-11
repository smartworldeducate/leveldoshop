import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOrders,
  toggleOrderStatus,
  deleteOrder,
} from "../../redux/admin/ordersSlice";
import { Eye, Trash2, CheckCircle, Clock, Loader2 } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import * as XLSX from "xlsx";
export default function Orders() {
  const dispatch = useDispatch();

  const { items, status, processingId } = useSelector(
    (state) => state.adminOrders
  );

  const [openOrder, setOpenOrder] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const formatDate = (ts) =>
    ts?.toDate ? ts.toDate().toLocaleString() : "N/A";

 

  const exportToExcel = () => {
  if (!items.length) {
    alert("No orders to export");
    return;
  }

  const formattedData = items.map((order) => ({
    OrderID: order.id,
    CustomerName: order.user?.name || "",
    Email: order.user?.email || "",
    Phone: order.user?.phone || "",
    City: order.user?.city || "",
    Address: order.user?.address || "",
    TotalPrice: order.totalPrice,
    Status: order.status || "pending",
    Date: order.createdAt?.toDate
      ? order.createdAt.toDate().toLocaleString()
      : "",
    Products: order.cartItems
      ?.map(
        (item) =>
          `${item.title} (Qty: ${item.quantity} × $${item.price})`
      )
      .join(" | "),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  XLSX.writeFile(workbook, "orders.xlsx");
};


const filteredOrders = items.filter((order) => {
  const term = searchTerm.toLowerCase();

  return (
    order.id?.toLowerCase().includes(term) ||
    order.user?.name?.toLowerCase().includes(term) ||
    order.user?.email?.toLowerCase().includes(term) ||
    order.user?.phone?.toLowerCase().includes(term) ||
    order.user?.city?.toLowerCase().includes(term) ||
    order.status?.toLowerCase().includes(term)
  );
});

 
 
  return (
    <div className="admin container">
      {/* <div className="admin__header">
        <h2>Orders</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-main" onClick={exportToExcel}>
            Export Excel
          </button>
          <span className="order-count">{items.length} orders</span>
        </div>
      </div> */}

      <div className="admin__header">
  <h2>Orders</h2>

  <div className="admin-actions">
    <input
      type="text"
      placeholder="Search orders..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="admin-search"
    />

    <button className="btn-main" onClick={exportToExcel}>
      Export Excel
    </button>

    <span className="order-count">
      {filteredOrders.length} orders
    </span>
  </div>
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
          <span>Actions</span>
        </div>

        {status === "loading" && (
          <div className="table-loading">
            <Loader2 className="spin" size={24} />
            Loading orders...
          </div>
        )}

        {status === "succeeded" &&
          filteredOrders.map((order) => (
            <div key={order.id} className="table-row">
              <span className="mono">#{order.id.slice(0, 6)}</span>
              <span>{order.user?.name || "N/A"}</span>
              <span>{order.user?.email || "N/A"}</span>
              <span>{order.user?.phone || "N/A"}</span>
              <span>{order.user?.city || "N/A"}</span>
              <span className="price">${order.totalPrice}</span>
              <span>{formatDate(order.createdAt)}</span>

              {/* STATUS */}
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

              {/* ACTIONS */}
              <span className="actions">
                {/* VIEW */}
                <button
                  className="btn-outline btn-sm"
                  onClick={() =>
                    setOpenOrder(openOrder === order.id ? null : order.id)
                  }
                  title="View order details"
                >
                  <Eye size={16} />
                </button>

                {/* COMPLETE */}
                <button
                  className="btn-main btn-sm"
                  title="Complete order"
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

                {/* DELETE */}
                <button
                  className="btn-light-danger btn-sm"
                  title="Delete order"
                  onClick={() => setDeleteModal(order)}
                >
                  <Trash2 size={16} />
                </button>
              </span>

              {/* ORDER DETAILS */}
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
          {status === "succeeded" && filteredOrders.length === 0 && (
  <div className="table-empty">
    No orders found.
  </div>
)}
      </div>

      {/* DELETE CONFIRMATION */}
      {deleteModal && (
        <div className="admin-modal">
          <div className="modal-box small">
            <div className="modal-header danger">
              <h3>Delete Order</h3>
            </div>

            <div className="modal-body">
              {deleteModal.status === "completed" ? (
                <p>
                  This order is <strong>completed</strong>.
                  <br />
                  Deleting it will <strong>restore product stock</strong>.
                  <br />
                  Are you sure?
                </p>
              ) : (
                <p>Are you sure you want to delete this order?</p>
              )}
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
                disabled={processingId === deleteModal.id}
                onClick={() => {
                  dispatch(deleteOrder(deleteModal.id));
                  setDeleteModal(null);
                }}
              >
                {processingId === deleteModal.id ? (
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
