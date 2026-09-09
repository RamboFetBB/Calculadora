import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('calc');
  const [display, setDisplay] = useState('');
  const [note, setNote] = useState('');
  const [historyGroups, setHistoryGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // Modais
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState('ADD');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('@calc_groups_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistoryGroups(parsed);
        if (parsed.length > 0) setActiveGroupId(parsed[0].id);
      } else {
        const defaultGroup = { id: 'default', name: 'Geral / Sem Nome', items: [] };
        setHistoryGroups([defaultGroup]);
        setActiveGroupId('default');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao carregar histórico');
    }
  };

  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem('@calc_groups_v4', JSON.stringify(data));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar dados');
    }
  };

  const handlePress = (value) => {
    setDisplay((prev) => prev + value);
  };

  const clearDisplay = () => {
    setDisplay('');
    setNote('');
  };

  const evaluateExpression = () => {
    if (!display.trim()) return null;
    try {
      const formattedExpr = display
        .replace(/,/g, '.')
        .replace(/×/g, '*')
        .replace(/÷/g, '/');

      const raw = eval(formattedExpr);
      if (isNaN(raw)) return null;
      return raw;
    } catch (e) {
      return null;
    }
  };

  const handleSaveCalculation = (type = 'ADD') => {
    const calculatedValue = evaluateExpression();
    if (calculatedValue === null) {
      Alert.alert('Erro', 'Expressão matemática inválida');
      return;
    }

    const targetGroupId = activeGroupId || historyGroups[0]?.id || 'default';

    const newItem = {
      id: Date.now().toString(),
      value: Math.abs(calculatedValue),
      type: type,
      note: note.trim() || 'Sem observação',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('pt-BR')
    };

    const updatedGroups = historyGroups.map((group) => {
      if (group.id === targetGroupId) {
        return {
          ...group,
          items: [newItem, ...group.items]
        };
      }
      return group;
    });

    setHistoryGroups(updatedGroups);
    saveData(updatedGroups);

    const formattedResult = calculatedValue.toString().replace('.', ',');
    setDisplay(formattedResult);
    setNote('');
    Alert.alert('Salvo!', `Cálculo (${type === 'ADD' ? '+' : '-'}) registrado com sucesso.`);
  };

  const getGroupTotal = (group) => {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc, item) => {
      return item.type === 'SUB' ? acc - item.value : acc + item.value;
    }, 0);
  };

  const selectGroupAndPullTotal = (group) => {
    setActiveGroupId(group.id);
    const total = getGroupTotal(group);
    setDisplay(total !== 0 ? total.toString().replace('.', ',') : '');
    setActiveTab('calc');
  };

  const pullSpecificValue = (value) => {
    setDisplay(value.toString().replace('.', ','));
    setActiveTab('calc');
  };

  const handleCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      Alert.alert('Aviso', 'Digite um nome para o histórico');
      return;
    }

    const existing = historyGroups.find(
      (g) => g.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      setActiveGroupId(existing.id);
    } else {
      const newGroup = {
        id: Date.now().toString(),
        name: trimmed,
        items: []
      };
      const updated = [newGroup, ...historyGroups];
      setHistoryGroups(updated);
      saveData(updated);
      setActiveGroupId(newGroup.id);
    }

    setNewGroupName('');
    setGroupModalVisible(false);
  };

  const deleteGroup = (id) => {
    if (historyGroups.length <= 1) {
      Alert.alert('Aviso', 'Você precisa manter pelo menos um histórico ativo.');
      return;
    }
    const updated = historyGroups.filter((g) => g.id !== id);
    setHistoryGroups(updated);
    if (activeGroupId === id) {
      setActiveGroupId(updated[0].id);
    }
    saveData(updated);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditValue(item.value.toString().replace('.', ','));
    setEditNote(item.note);
    setEditType(item.type);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    const parsedValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(parsedValue)) {
      Alert.alert('Erro', 'Digite um valor numérico válido');
      return;
    }

    const updatedGroups = historyGroups.map((group) => {
      if (group.id === activeGroupId) {
        const updatedItems = group.items.map((item) => {
          if (item.id === editingItem.id) {
            return {
              ...item,
              value: Math.abs(parsedValue),
              type: editType,
              note: editNote.trim() || 'Sem observação'
            };
          }
          return item;
        });
        return { ...group, items: updatedItems };
      }
      return group;
    });

    setHistoryGroups(updatedGroups);
    saveData(updatedGroups);
    setEditModalVisible(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId) => {
    const updatedGroups = historyGroups.map((group) => {
      if (group.id === activeGroupId) {
        const updatedItems = group.items.filter((item) => item.id !== itemId);
        return { ...group, items: updatedItems };
      }
      return group;
    });

    setHistoryGroups(updatedGroups);
    saveData(updatedGroups);
  };

  const activeGroup = historyGroups.find((g) => g.id === activeGroupId) || historyGroups[0];
  const activeTotal = getGroupTotal(activeGroup);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />

      {/* Navegação Topo */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'calc' && styles.activeTabButton]}
          onPress={() => setActiveTab('calc')}
        >
          <Text style={[styles.tabText, activeTab === 'calc' && styles.activeTabText]}>
            Calculadora
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Históricos
          </Text>
        </TouchableOpacity>
      </View>

      {/* ABA CALCULADORA */}
      {activeTab === 'calc' && (
        <ScrollView contentContainerStyle={styles.calcView} showsVerticalScrollIndicator={false}>
          {/* Card de Informação */}
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>
              Lançando em: <Text style={styles.infoBadgeHighlight}>{activeGroup?.name || 'Geral'}</Text>
            </Text>
          </View>

          {/* Campo de Observação */}
          <TextInput
            style={styles.noteInput}
            placeholder="Observação (ex: Peça A, Serviço)..."
            placeholderTextColor="#5A5A72"
            value={note}
            onChangeText={setNote}
          />

          {/* Display da Calculadora */}
          <View style={styles.displayContainer}>
            <TextInput
              style={styles.displayText}
              value={display}
              onChangeText={setDisplay}
              placeholder="0"
              placeholderTextColor="#2E2E3A"
              keyboardType="numeric"
            />
          </View>

          {/* Botões de Ação (+ Somar / - Subtrair) */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.addBtn]}
              onPress={() => handleSaveCalculation('ADD')}
            >
              <Text style={styles.actionBtnText}>+ Somar no Histórico</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.subBtn]}
              onPress={() => handleSaveCalculation('SUB')}
            >
              <Text style={styles.actionBtnText}>- Subtrair no Histórico</Text>
            </TouchableOpacity>
          </View>

          {/* Teclado Customizado */}
          <View style={styles.keypad}>
            {[
              'C', '÷', '×', '-',
              '7', '8', '9', '+',
              '4', '5', '6', '.',
              '1', '2', '3', ',',
              '0', '='
            ].map((char) => {
              const isOp = ['+', '-', '×', '÷'].includes(char);
              const isClear = char === 'C';
              const isEqual = char === '=';

              return (
                <TouchableOpacity
                  key={char}
                  style={[
                    styles.button,
                    isOp && styles.opButton,
                    isClear && styles.clearButton,
                    isEqual && styles.equalButton
                  ]}
                  onPress={() => {
                    if (char === 'C') clearDisplay();
                    else if (char === '=') {
                      const res = evaluateExpression();
                      if (res !== null) setDisplay(res.toString().replace('.', ','));
                    } else handlePress(char);
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    isOp && styles.opButtonText,
                    isClear && styles.clearButtonText,
                    isEqual && styles.equalButtonText
                  ]}>
                    {char}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ABA HISTÓRICOS */}
      {activeTab === 'history' && (
        <View style={styles.historyView}>
          <TouchableOpacity
            style={styles.createGroupBtn}
            onPress={() => setGroupModalVisible(true)}
          >
            <Text style={styles.createGroupBtnText}>+ Criar Novo Histórico Nomeado</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Históricos disponíveis:</Text>
          <View style={{ maxHeight: 42, marginBottom: 15 }}>
            <FlatList
              horizontal
              data={historyGroups}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = activeGroupId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.groupChip, isSelected && styles.activeGroupChip]}
                    onPress={() => setActiveGroupId(item.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Card Totalizador */}
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Total em {activeGroup?.name}:</Text>
              <Text style={styles.totalValue}>
                R$ {activeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.pullTotalBtn}
              onPress={() => selectGroupAndPullTotal(activeGroup)}
            >
              <Text style={styles.pullTotalBtnText}>Usar Total</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Lançamentos */}
          <View style={{ flex: 1 }}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Lançamentos ({activeGroup?.items?.length || 0})</Text>
              <TouchableOpacity onPress={() => deleteGroup(activeGroup?.id)}>
                <Text style={styles.deleteGroupText}>Excluir Histórico</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeGroup?.items || []}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhum cálculo neste histórico ainda.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.itemType, item.type === 'SUB' ? styles.subText : styles.addText]}>
                        {item.type === 'SUB' ? '-' : '+'} R$ {item.value.toString().replace('.', ',')}
                      </Text>
                      <Text style={styles.itemDate}>• {item.timestamp}</Text>
                    </View>
                    <Text style={styles.itemNote}>{item.note}</Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.loadBtn}
                      onPress={() => pullSpecificValue(item.value)}
                    >
                      <Text style={styles.loadBtnText}>Usar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      )}

      {/* MODAL NOVO HISTÓRICO */}
      <Modal visible={groupModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Histórico</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome (ex: Peças, Reforma...)"
              placeholderTextColor="#5A5A72"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setGroupModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.btnText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR LANÇAMENTO */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Lançamento</Text>

            <Text style={styles.label}>Operação:</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, editType === 'ADD' && styles.typeBtnAddActive]}
                onPress={() => setEditType('ADD')}
              >
                <Text style={styles.btnText}>+ Adição</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, editType === 'SUB' && styles.typeBtnSubActive]}
                onPress={() => setEditType('SUB')}
              >
                <Text style={styles.btnText}>- Subtração</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Valor:</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editValue}
              onChangeText={setEditValue}
            />

            <Text style={styles.label}>Observação:</Text>
            <TextInput
              style={styles.modalInput}
              value={editNote}
              onChangeText={setEditNote}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.deleteModalBtn]}
                onPress={() => {
                  handleDeleteItem(editingItem.id);
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.btnText}>Excluir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12', paddingTop: 40 },
  
  // Abas Topo
  tabContainer: { flexDirection: 'row', backgroundColor: '#16161E', marginHorizontal: 16, borderRadius: 14, padding: 4, marginBottom: 10 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTabButton: { backgroundColor: '#232330' },
  tabText: { color: '#5A5A72', fontWeight: '600', fontSize: 15 },
  activeTabText: { color: '#6C5CE7' },

  // Calculadora
  calcView: { paddingHorizontal: 16, paddingBottom: 20 },
  infoBadge: { alignSelf: 'flex-end', backgroundColor: '#16161E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  infoBadgeText: { color: '#8E8EA0', fontSize: 12 },
  infoBadgeHighlight: { color: '#6C5CE7', fontWeight: 'bold' },
  
  noteInput: { backgroundColor: '#16161E', color: '#FFF', padding: 14, borderRadius: 12, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: '#232330' },
  displayContainer: { backgroundColor: '#16161E', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#232330', minHeight: 90, justifyContent: 'center' },
  displayText: { color: '#FFF', fontSize: 38, textAlign: 'right', fontWeight: '600' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { width: '48%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  addBtn: { backgroundColor: '#10B981' },
  subBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  // Teclado
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '22%', backgroundColor: '#16161E', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#232330' },
  buttonText: { color: '#E4E4E8', fontSize: 22, fontWeight: '500' },
  opButton: { backgroundColor: '#232330' },
  opButtonText: { color: '#6C5CE7', fontWeight: 'bold' },
  clearButton: { backgroundColor: '#2A171A' },
  clearButtonText: { color: '#EF4444' },
  equalButton: { width: '48%', backgroundColor: '#6C5CE7' },
  equalButtonText: { color: '#FFF', fontWeight: 'bold' },

  // Históricos
  historyView: { flex: 1, paddingHorizontal: 16 },
  createGroupBtn: { backgroundColor: '#6C5CE7', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  createGroupBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  sectionLabel: { color: '#8E8EA0', fontSize: 12, marginBottom: 8 },
  
  groupChip: { backgroundColor: '#16161E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center', borderWidth: 1, borderColor: '#232330' },
  activeGroupChip: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  chipText: { color: '#8E8EA0', fontWeight: '600', fontSize: 13 },
  activeChipText: { color: '#FFF' },

  totalCard: { backgroundColor: '#16161E', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#232330' },
  totalLabel: { color: '#8E8EA0', fontSize: 12 },
  totalValue: { color: '#10B981', fontSize: 24, fontWeight: 'bold', marginTop: 2 },
  pullTotalBtn: { backgroundColor: '#232330', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#3A3A4D' },
  pullTotalBtnText: { color: '#6C5CE7', fontWeight: 'bold', fontSize: 12 },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  deleteGroupText: { color: '#EF4444', fontSize: 12 },

  itemCard: { backgroundColor: '#16161E', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#232330' },
  itemType: { fontSize: 16, fontWeight: 'bold' },
  addText: { color: '#10B981' },
  subText: { color: '#EF4444' },
  itemDate: { color: '#5A5A72', fontSize: 11 },
  itemNote: { color: '#A0A0B2', fontSize: 13, marginTop: 2 },
  
  itemActions: { flexDirection: 'row' },
  editBtn: { backgroundColor: '#232330', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 6 },
  editBtnText: { color: '#8E8EA0', fontSize: 11, fontWeight: '600' },
  loadBtn: { backgroundColor: '#6C5CE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  loadBtnText: { color: '#FFF', fontSize: 11, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#5A5A72', fontStyle: 'italic' },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#16161E', width: '85%', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#232330' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  label: { color: '#8E8EA0', fontSize: 12, marginBottom: 6 },
  modalInput: { backgroundColor: '#0D0D12', color: '#FFF', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#232330' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { padding: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#232330' },
  confirmBtn: { backgroundColor: '#6C5CE7' },
  deleteModalBtn: { backgroundColor: '#EF4444' },
  btnText: { color: '#FFF', fontWeight: 'bold' },

  typeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  typeBtn: { width: '48%', padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#232330' },
  typeBtnAddActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  typeBtnSubActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' }
});
