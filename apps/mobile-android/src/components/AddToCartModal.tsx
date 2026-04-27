import React, { memo, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  FlatList,
} from "react-native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import { getImageUrl } from "../utils/imageHelper";

const COLORS = { PRIMARY: "#EE4D2D", BG: "#F5F5F7" };

interface Dish {
  id: number;
  ten_mon_an: string;
  gia_ban: number;
  gia_khuyen_mai: number;
  hinh_anh: string | null;
  id_quan_an: number;
}

interface DishSize {
  id: number;
  ten_size: string;
  gia_them: number;
}

interface DishTopping {
  id: number;
  ten_topping: string;
  gia: number;
  loai: string;
  hinh_anh?: string | null;
  mo_ta?: string;
}

interface AddToCartModalProps {
  visible: boolean;
  dish: Dish | null;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  note: string;
  onNoteChange: (note: string) => void;
  onConfirm: () => void;
  onOrder: () => void;
  onCancel: () => void;
  sizes?: DishSize[];
  toppings?: DishTopping[];
  selectedSizeId?: number | null;
  onSizeChange?: (sizeId: number | null) => void;
  selectedToppingIds?: number[];
  onToppingChange?: (toppingIds: number[]) => void;
  loading?: boolean;
}

const formatPrice = (price: number): string => {
  if (!price) return "0đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const AddToCartModal = memo<AddToCartModalProps>(
  ({
    visible,
    dish,
    quantity,
    onQuantityChange,
    note,
    onNoteChange,
    onConfirm,
    onOrder,
    onCancel,
    sizes = [],
    toppings = [],
    selectedSizeId = null,
    onSizeChange,
    selectedToppingIds = [],
    onToppingChange,
    loading = false,
  }) => {
    console.warn("📦 AddToCartModal RENDERED - visible:", visible, "dish:", dish?.ten_mon_an);

    // Tính tổng giá toppings được chọn
    const toppingTotalPrice = (selectedToppingIds || []).reduce((sum, toppingId) => {
      const topping = toppings.find(t => t.id === toppingId);
      return sum + (topping?.gia || 0);
    }, 0);

    // Tính tổng giá size
    const sizePriceAdd = sizes.find(s => s.id === selectedSizeId)?.gia_them || 0;

    // Giá chiếc = giá gốc + giá size + giá toppings
    const basePrice = (dish?.gia_khuyen_mai || 0) + sizePriceAdd + toppingTotalPrice;
    const totalPrice = basePrice * quantity;

    const handleToppingToggle = (toppingId: number) => {
      if (!onToppingChange) return;
      if ((selectedToppingIds || []).includes(toppingId)) {
        onToppingChange((selectedToppingIds || []).filter(id => id !== toppingId));
      } else {
        onToppingChange([...(selectedToppingIds || []), toppingId]);
      }
    };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onCancel}
        onShow={() => console.warn("✅🎉 ADD TO CART MODAL OPENED!")}
        onDismiss={() => console.warn("❌ ADD TO CART MODAL CLOSED")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {dish && (<>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm vào giỏ hàng</Text>
              <TouchableOpacity onPress={onCancel} disabled={loading}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Dish Image */}
              <Image
                source={{ uri: getImageUrl(dish.hinh_anh) }}
                style={styles.dishImage}
              />

              {/* Dish Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{dish.ten_mon_an}</Text>
                <Text style={styles.dishPrice}>{formatPrice(dish.gia_khuyen_mai)}</Text>
              </View>

              {/* Size Selection */}
              {sizes && sizes.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Size (tùy chọn)</Text>
                  <View style={styles.sizeContainer}>
                    {sizes.map(size => (
                      <TouchableOpacity
                        key={size.id}
                        style={[
                          styles.sizeButton,
                          selectedSizeId === size.id && styles.sizeButtonActive
                        ]}
                        onPress={() => onSizeChange?.(selectedSizeId === size.id ? null : size.id)}
                        disabled={loading}
                      >
                        <Text style={[
                          styles.sizeButtonText,
                          selectedSizeId === size.id && styles.sizeButtonTextActive
                        ]}>
                          {size.ten_size}
                        </Text>
                        {size.gia_them > 0 && (
                          <Text style={[
                            styles.sizePrice,
                            selectedSizeId === size.id && styles.sizePriceActive
                          ]}>
                            +{formatPrice(size.gia_them)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Toppings Selection */}
              {toppings && toppings.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Toppings (tùy chọn)</Text>
                  <View style={styles.toppingsContainer}>
                    {toppings.map(topping => (
                      <TouchableOpacity
                        key={topping.id}
                        style={[
                          styles.toppingItem,
                          (selectedToppingIds || []).includes(topping.id) && styles.toppingItemActive
                        ]}
                        onPress={() => handleToppingToggle(topping.id)}
                        disabled={loading}
                      >
                        <View style={styles.toppingCheckbox}>
                          {(selectedToppingIds || []).includes(topping.id) && (
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          )}
                        </View>
                        <View style={styles.toppingInfo}>
                          <Text style={styles.toppingName}>{topping.ten_topping}</Text>
                          {topping.mo_ta && (
                            <Text style={styles.toppingDesc} numberOfLines={1}>{topping.mo_ta}</Text>
                          )}
                        </View>
                        <Text style={styles.toppingPrice}>+{formatPrice(topping.gia)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Quantity Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Số lượng</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
                    disabled={loading}
                  >
                    <Ionicons name="remove" size={18} color="white" />
                  </TouchableOpacity>

                  <Text style={styles.quantityValue}>{quantity}</Text>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => onQuantityChange(quantity + 1)}
                    disabled={loading}
                  >
                    <Ionicons name="add" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Note Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Ghi chú thêm (tùy chọn)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Vd: Không cay, ít đường..."
                  placeholderTextColor="#CBD5E1"
                  value={note}
                  onChangeText={onNoteChange}
                  multiline={true}
                  editable={!loading}
                  numberOfLines={4}
                />
              </View>

              {/* Summary */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Giá gốc:</Text>
                  <Text style={styles.summaryValue}>{formatPrice(dish.gia_khuyen_mai)}</Text>
                </View>
                {selectedSizeId && sizePriceAdd > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>+ Size:</Text>
                    <Text style={styles.summaryValue}>+{formatPrice(sizePriceAdd)}</Text>
                  </View>
                )}
                {(selectedToppingIds || []).length > 0 && toppingTotalPrice > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>+ Toppings ({(selectedToppingIds || []).length}):</Text>
                    <Text style={styles.summaryValue}>+{formatPrice(toppingTotalPrice)}</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                  <Text style={styles.summaryLabelTotal}>
                    Tổng ({quantity} x {formatPrice(basePrice)}):
                  </Text>
                  <Text style={styles.summaryPriceTotal}>
                    {formatPrice(totalPrice)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.orderButton, loading && styles.opacityDisabled]}
                onPress={onOrder}
                disabled={loading}
              >
                <Ionicons name="flash" size={18} color="white" />
                <Text style={styles.orderButtonText}>Đặt hàng ngay</Text>
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addCartButton, loading && styles.opacityDisabled]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  <Ionicons name="bag-add-outline" size={16} color={"#EE4D2D"} />
                  <Text style={styles.addCartButtonText}>
                    {loading ? "Đang thêm..." : "Thêm vào giỏ"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            </>)}
          </View>
        </View>
      </Modal>
    );
  }
);

export default AddToCartModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "92%",
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },

  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  dishImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderRadius: 10,
    marginBottom: 16,
  },

  modalSection: {
    marginVertical: 18,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  dishPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    justifyContent: "center",
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 30,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  noteInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 80,
    textAlignVertical: "top",
  },

  summaryBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    letterSpacing: 0.2,
  },

  modalFooter: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    elevation: 3,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    flex: 0.7,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.2,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    elevation: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  addCartButton: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#FFF1EE",
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  addCartButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    letterSpacing: 0.2,
  },
  orderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    elevation: 3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  orderButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.2,
  },
  opacityDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.2,
  },
  
  // ──── Size Styles ────
  sizeContainer: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  sizeButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  sizeButtonActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: "#FFF5F3",
  },
  sizeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  sizeButtonTextActive: {
    color: COLORS.PRIMARY,
  },
  sizePrice: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  sizePriceActive: {
    color: COLORS.PRIMARY,
  },
  
  // ──── Topping Styles ────
  toppingsContainer: {
    gap: 10,
  },
  toppingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  toppingItemActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: "#FFF5F3",
  },
  toppingCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  toppingCheckboxActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  toppingInfo: {
    flex: 1,
  },
  toppingName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  toppingDesc: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  toppingPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.PRIMARY,
    marginLeft: 8,
  },
  
  // ──── Updated Summary Styles ────
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTopVertical: 12,
    marginTop: 12,
  },
  summaryLabelTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryPriceTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.PRIMARY,
    letterSpacing: 0.2,
  },
});
