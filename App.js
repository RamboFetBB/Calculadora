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
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' | 'history'
  const [display, setDisplay] = useState('');
  const [note, setNote] = useState(''); // Observação do novo cálculo
  const [historyGroups, setHistoryGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // Modais
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Item sendo editado
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState('ADD'); // 'ADD' ou 'SUB'

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

  // Calcular o resultado da expressão
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

  // Salvar um cálculo (Soma ou Subtração)
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
      type: type, // 'ADD' ou 'SUB'
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
    Alert.alert('Sucesso', `Cálculo (${type === 'ADD' ? '+' : '-'}) registrado no histórico!`);
  };

  // Calcular total acumulado de um grupo
  const getGroupTotal = (group) => {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc, item) => {
      return item.type === 'SUB' ? acc - item.value : acc + item.value;
    }, 0);
  };

  // Selecionar grupo do histórico e carregar total na calculadora
  const selectGroupAndPullTotal = (group) => {
    setActiveGroupId(group.id);
    const total = getGroupTotal(group);
    setDisplay(total !== 0 ? total.toString().replace('.', ',') : '');
    setActiveTab('calc');
  };

  // Puxar item específico de volta para a calculadora
  const pullSpecificValue = (value) => {
    setDisplay(value.toString().replace('.', ','));
    setActiveTab('calc');
  };

  // Criar Novo Grupo de Histórico
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

  // Excluir Grupo Inteiro
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

  // ABRIR MODAL DE EDIÇÃO DE ITEM
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditValue(item.value.toString().replace('.', ','));
    setEditNote(item.note);
    setEditType(item.type);
    setEditModalVisible(true);
  };

  // SALVAR EDIÇÃO DO ITEM
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

  // EXCLUIR ITEM ESPECÍFICO DO HISTÓRICO
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
      {/* Menu Superior de Abas */}
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

      {/* ABA 1: CALCULADORA */}
      {activeTab === 'calc' && (
        <ScrollView contentContainerStyle={styles.calcView}>
          <Text style={styles.activeGroupTag}>
            Histórico Ativo: <Text style={{ color: '#ff9500', fontWeight: 'bold' }}>{activeGroup?.name || 'Geral'}</Text>
          </Text>

          {/* Campo de Observação do Cálculo */}
          <TextInput
            style={styles.noteInput}
            placeholder="Adicionar observação ao cálculo (opcional)..."
            placeholderTextColor="#777"
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.displayContainer}>
            <TextInput
              style={styles.displayText}
              value={display}
              onChangeText={setDisplay}
              placeholder="0"
              placeholderTextColor="#555"
              keyboardType="numeric"
            />
          </View>

          {/* Botoes de Ação Direta (+ Salvar / - Subtrair do Histórico) */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#28a745' }]}
              onPress={() => handleSaveCalculation('ADD')}
            >
              <Text style={styles.actionBtnText}>+ Somar no Histórico</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}
              onPress={() => handleSaveCalculation('SUB')}
            >
              <Text style={styles.actionBtnText}>- Subtrair no Histórico</Text>
            </TouchableOpacity>
          </View>

          {/* Teclado Numerico */}
          <View style={styles.keypad}>
            {[
              'C', '÷', '×', '-',
              '7', '8', '9', '+',
              '4', '5', '6', '.',
              '1', '2', '3', ',',
              '0', '='
            ].map((char) => {
              const isOp = ['+', '-', '×', '÷', '='].includes(char);
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
                  <Text style={styles.buttonText}>{char}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ABA 2: HISTÓRICOS */}
      {activeTab === 'history' && (
        <View style={styles.historyView}>
          <TouchableOpacity
            style={styles.createGroupBtn}
            onPress={() => setGroupModalVisible(true)}
          >
            <Text style={styles.createGroupBtnText}>+ Criar Novo Histórico Nomeado</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Selecione o Histórico:</Text>
          <View style={{ maxHeight: 45, marginBottom: 10 }}>
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

          {/* Banner com Total Acumulado do Histórico */}
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Total Acumulado ({activeGroup?.name}):</Text>
              <Text style={styles.totalValue}>{activeTotal.toString().replace('.', ',')}</Text>
            </View>
            <TouchableOpacity
              style={styles.pullTotalBtn}
              onPress={() => selectGroupAndPullTotal(activeGroup)}
            >
              <Text style={styles.pullTotalBtnText}>Carregar Total</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Itens/Lançamentos do Histórico Ativo */}
          <View style={{ flex: 1 }}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Lançamentos ({activeGroup?.items?.length || 0})</Text>
              <TouchableOpacity onPress={() => deleteGroup(activeGroup?.id)}>
                <Text style={styles.deleteGroupText}>Excluir Histórico Inteiro</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeGroup?.items || []}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhum cálculo salvo neste histórico.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.itemType, item.type === 'SUB' ? styles.subText : styles.addText]}>
                        {item.type === 'SUB' ? '-' : '+'} {item.value.toString().replace('.', ',')}
                      </Text>
                      <Text style={styles.itemDate}> ({item.date} {item.timestamp})</Text>
                    </View>
                    <Text style={styles.itemNote}>Obs: {item.note}</Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.btnActionText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.loadBtn}
                      onPress={() => pullSpecificValue(item.value)}
                    >
                      <Text style={styles.btnActionText}>Usar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      )}

      {/* MODAL 1: CRIAR NOVO HISTÓRICO */}
      <Modal visible={groupModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Histórico Nomeado</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Alemão, Obra Casa, Ferramentas..."
              placeholderTextColor="#888"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#444' }]}
                onPress={() => setGroupModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ff9500' }]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.btnText}>Criar / Abrir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDITAR ITEM / LANÇAMENTO DO HISTÓRICO */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Lançamento</Text>

            <Text style={styles.label}>Tipo de Operação:</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, editType === 'ADD' && { backgroundColor: '#28a745' }]}
                onPress={() => setEditType('ADD')}
              >
                <Text style={styles.btnText}>+ Adição</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, editType === 'SUB' && { backgroundColor: '#dc3545' }]}
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
                style={[styles.modalBtn, { backgroundColor: '#dc3545' }]}
                onPress={() => {
                  handleDeleteItem(editingItem.id);
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.btnText}>Excluir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#28a745' }]}
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
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 45 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1e1e1e', marginHorizontal: 15, borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#2a2a2a' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#ff9500' },
  calcView: { padding: 15 },
  activeGroupTag: { color: '#aaa', fontSize: 14, marginBottom: 8, textAlign: 'right' },
  noteInput: { backgroundColor: '#1e1e1e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  displayContainer: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 12, marginBottom: 12 },
  displayText: { color: '#fff', fontSize: 36, textAlign: 'right' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { width: '48%', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '22%', backgroundColor: '#2a2a2a', paddingVertical: 18, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  opButton: { backgroundColor: '#ff9500' },
  clearButton: { backgroundColor: '#dc3545' },
  equalButton: { width: '48%', backgroundColor: '#28a745' },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  historyView: { flex: 1, padding: 15 },
  createGroupBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  createGroupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  sectionLabel: { color: '#aaa', fontSize: 12, marginBottom: 6 },
  groupChip: { backgroundColor: '#2a2a2a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center' },
  activeGroupChip: { backgroundColor: '#ff9500' },
  chipText: { color: '#ccc', fontWeight: 'bold' },
  activeChipText: { color: '#fff' },
  totalCard: { backgroundColor: '#1e1e1e', padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#ff9500' },
  totalLabel: { color: '#aaa', fontSize: 13 },
  totalValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  pullTotalBtn: { backgroundColor: '#ff9500', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  pullTotalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  deleteGroupText: { color: '#dc3545', fontSize: 12 },
  itemCard: { backgroundColor: '#1e1e1e', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemType: { fontSize: 18, fontWeight: 'bold' },
  addText: { color: '#28a745' },
  subText: { color: '#dc3545' },
  itemDate: { color: '#666', fontSize: 12 },
  itemNote: { color: '#ccc', fontSize: 13, marginTop: 2 },
  itemActions: { flexDirection: 'row' },
  editBtn: { backgroundColor: '#007bff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5, marginRight: 5 },
  loadBtn: { backgroundColor: '#ff9500', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5 },
  btnActionText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#666', fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#222', width: '85%', padding: 20, borderRadius: 12 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  modalInput: { backgroundColor: '#333', color: '#fff', padding: 10, borderRadius: 6, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { padding: 12, borderRadius: 6, width: '48%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  typeBtn: { width: '48%', padding: 10, borderRadius: 6, alignItems: 'center', backgroundColor: '#333' }
});
