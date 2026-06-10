import { riskPreviewFeeRows } from '@/config/cross-platform-parity';
import { colors } from '@/constants/colors';
import { ShieldAlert, X } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface RiskPreviewFeeBreakdown {
  networkFee: string;
  providerFee: string;
  midoriFee: string;
}

interface RiskPreviewSheetProps {
  visible: boolean;
  title: string;
  description: string;
  origin: string;
  network: string;
  fees: RiskPreviewFeeBreakdown;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RiskPreviewSheet({
  visible,
  title,
  description,
  origin,
  network,
  fees,
  onCancel,
  onConfirm,
}: RiskPreviewSheetProps) {
  const feeValues = [fees.networkFee, fees.providerFee, fees.midoriFee];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <ShieldAlert size={22} color={colors.warning} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.iconButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{description}</Text>

          <View style={styles.metaBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Origen</Text>
              <Text style={styles.value}>{origin}</Text>
            </View>
            <View style={styles.rowLast}>
              <Text style={styles.label}>Red</Text>
              <Text style={styles.value}>{network}</Text>
            </View>
          </View>

          <View style={styles.metaBox}>
            {riskPreviewFeeRows.map((label, index) => (
              <View key={label} style={index === riskPreviewFeeRows.length - 1 ? styles.rowLast : styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{feeValues[index]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  iconButton: {
    padding: 4,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  metaBox: {
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  rowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginRight: 12,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '700',
  },
});
