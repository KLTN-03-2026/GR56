import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

// ─── Types ───────────────────────────────────────────

export type AlertType = "success" | "error" | "warning" | "info" | "confirm";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  /** Tắt tính năng bấm nền để đóng */
  dismissOnBackdrop?: boolean;
}

// ─── Config theo type ────────────────────────────────

const TYPE_CONFIG: Record<
  AlertType,
  { icon: string; color: string; bg: string; ringColor: string }
> = {
  success: {
    icon: "checkmark-circle",
    color: "#10B981",
    bg: "#D1FAE5",
    ringColor: "#A7F3D0",
  },
  error: {
    icon: "close-circle",
    color: "#EF4444",
    bg: "#FEE2E2",
    ringColor: "#FCA5A5",
  },
  warning: {
    icon: "warning",
    color: "#F59E0B",
    bg: "#FEF3C7",
    ringColor: "#FDE68A",
  },
  info: {
    icon: "information-circle",
    color: "#3B82F6",
    bg: "#DBEAFE",
    ringColor: "#BFDBFE",
  },
  confirm: {
    icon: "help-circle",
    color: "#EE4D2D",
    bg: "#FFE8EC",
    ringColor: "#FECDD3",
  },
};

// ─── Component ───────────────────────────────────────

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type = "info",
  title,
  message,
  buttons = [{ text: "OK", style: "default" }],
  onDismiss,
  dismissOnBackdrop = true,
}) => {
  const config = TYPE_CONFIG[type];

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleBackdropPress = () => {
    if (dismissOnBackdrop && onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              {/* Icon */}
              <View style={[styles.iconRing, { backgroundColor: config.ringColor }]}>
                <View style={[styles.iconBg, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon} size={wp("9%")} color={config.color} />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Buttons */}
              <View style={[styles.buttonsRow, buttons.length === 1 && styles.buttonsCenter]}>
                {buttons.map((btn, idx) => {
                  const isDestructive = btn.style === "destructive";
                  const isCancel = btn.style === "cancel";
                  const isDefault = !isDestructive && !isCancel;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.button,
                        buttons.length === 1 && styles.buttonFull,
                        isDefault && { backgroundColor: config.color },
                        isCancel && styles.buttonCancel,
                        isDestructive && styles.buttonDestructive,
                      ]}
                      onPress={() => {
                        if (onDismiss) onDismiss();
                        if (btn.onPress) btn.onPress();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isDefault && styles.buttonTextPrimary,
                          isCancel && styles.buttonTextCancel,
                          isDestructive && styles.buttonTextDestructive,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("8%"),
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: wp("5%"),
    paddingTop: hp("4%"),
    paddingBottom: hp("2.5%"),
    paddingHorizontal: wp("6%"),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  iconRing: {
    width: wp("22%"),
    height: wp("22%"),
    borderRadius: wp("11%"),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("2%"),
  },
  iconBg: {
    width: wp("16%"),
    height: wp("16%"),
    borderRadius: wp("8%"),
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: hp("1%"),
  },
  message: {
    fontSize: wp("3.5%"),
    color: "#64748B",
    textAlign: "center",
    lineHeight: hp("2.5%"),
    marginBottom: hp("0.5%"),
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    width: "100%",
    marginVertical: hp("2%"),
  },
  buttonsRow: {
    flexDirection: "row",
    width: "100%",
    gap: wp("3%"),
  },
  buttonsCenter: {
    justifyContent: "center",
  },
  button: {
    flex: 1,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    alignItems: "center",
    justifyContent: "center",
  },
  buttonFull: {
    flex: 1,
  },
  buttonCancel: {
    backgroundColor: "#F1F5F9",
  },
  buttonDestructive: {
    backgroundColor: "#FEE2E2",
  },
  buttonText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
  },
  buttonTextPrimary: {
    color: "#FFF",
  },
  buttonTextCancel: {
    color: "#64748B",
  },
  buttonTextDestructive: {
    color: "#EF4444",
  },
});

export default CustomAlert;
