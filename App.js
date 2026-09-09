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
  StatusBar,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' | 'shopping' | 'history'

  // States Calculadora & Históricos
  const [display, setDisplay] = useState('');
  const [note, setNote] = useState('');
  const [historyGroups, setHistoryGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // States Lista de Compras
  const [shoppingList, setShoppingList] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  // Modais
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Modal Editar Item da Lista de Compras
  const [editShopModalVisible, setEditShopModalVisible] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopQty, setEditShopQty] = useState('');
  const [editShopPrice, setEditShopPrice] = useState('');

  // Modal Escolha de Contato WhatsApp
  const [shareModalVisible, setShareModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('@calc_groups_v5');
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        setHistoryGroups(parsed);
        if (parsed.length > 0) setActiveGroupId(parsed[0].id);
      } else {
        const defaultGroup = { id: 'default', name: 'Geral / Sem Nome', items: [] };
        setHistoryGroups([defaultGroup]);
        setActiveGroupId('default');
      }

      const savedShop = await AsyncStorage.getItem('@shopping_list_v1');
      if (savedShop) {
        setShoppingList(JSON.parse(savedShop));
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao carregar dados salvos');
    }
  };

  const saveData = async (groups, shopList) => {
    try {
      if (groups) await AsyncStorage.setItem('@calc_groups_v5', JSON.stringify(groups));
      if (shopList) await AsyncStorage.setItem('@shopping_list_v1', JSON.stringify(shopList));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar dados');
    }
  };

  // --- LÓGICA CALCULADORA & HISTÓRICO ---
  const handlePress = (value) => setDisplay((prev) => prev + value);
  const clearDisplay = () => {
    setDisplay('');
    setNote('');
  };

  const evaluateExpression = () => {
    if (!display.trim()) return 0;
    try {
      const formattedExpr = display.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/');
      const raw = eval(formattedExpr);
      if (isNaN(raw)) return null;
      return raw;
    } catch (e) {
      return null;
    }
  };

  const handleSaveCalculation = (type = 'ADD') => {
    let calculatedValue = evaluateExpression();
    if (calculatedValue === null) {
      Alert.alert('Erro', 'Expressão matemática inválida');
      return;
    }

    const targetGroupId = activeGroupId || historyGroups[0]?.id || 'default';
    const newItem = {
      id: Date.now().toString(),
      value: Math.abs(calculatedValue),
      type: type,
      note: note.trim() || 'Sem observação/descrição',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('pt-BR')
    };

    const updatedGroups = historyGroups.map((group) => {
      if (group.id === targetGroupId) {
        return { ...group, items: [newItem, ...group.items] };
      }
      return group;
    });

    setHistoryGroups(updatedGroups);
    saveData(updatedGroups, null);
    setDisplay('');
    setNote('');
    Alert.alert('Salvo!', 'Lançamento salvo no histórico.');
  };

  // IMPORTAÇÃO DE JSON NA CALCULADORA
  const handleImportJSONFromNote = () => {
    if (!note.trim()) {
      Alert.alert('Aviso', 'Cole o texto JSON do WhatsApp no campo de observação acima antes de importar.');
      return;
    }

    try {
      // Limpa possíveis formatações do WhatsApp (como blocos de código ``` )
      const cleanText = note.replace(/```json/g, '').replace(/```/g, '').trim();
      const importedList = JSON.parse(cleanText);

      if (!Array.isArray(importedList)) {
        Alert.alert('Erro', 'O texto colar não é uma lista válida de compras.');
        return;
      }

      // Adiciona IDs novos para evitar conflitos no armazenamento
      const formattedList = importedList.map((item, index) => ({
        id: (Date.now() + index).toString(),
        name: item.name || 'Item sem nome',
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0
      }));

      const updatedList = [...formattedList, ...shoppingList];
      setShoppingList(updatedList);
      saveData(null, updatedList);

      setNote('');
      Alert.alert('Sucesso!', `${formattedList.length} itens foram importados para a sua Lista de Compras.`, [
        { text: 'Ir para a Lista', onPress: () => setActiveTab('shopping') },
        { text: 'OK' }
      ]);
    } catch (e) {
      Alert.alert('Erro ao Importar', 'O texto copiado não está em formato JSON válido.');
    }
  };

  const getGroupTotal = (group) => {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc, item) => {
      return item.type === 'SUB' ? acc - item.value : acc + item.value;
    }, 0);
  };

  // --- LÓGICA LISTA DE COMPRAS ---
  const handleAddShoppingItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Aviso', 'Digite o nome do item');
      return;
    }

    const qtyNum = parseFloat(itemQty.replace(',', '.')) || 1;
    const priceNum = parseFloat(itemPrice.replace(',', '.')) || 0;

    const newItem = {
      id: Date.now().toString(),
      name: itemName.trim(),
      qty: qtyNum,
      price: priceNum
    };

    const updatedList = [newItem, ...shoppingList];
    setShoppingList(updatedList);
    saveData(null, updatedList);

    setItemName('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleConfirmDeleteShopItem = (item) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente remover "${item.name}" da lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const updated = shoppingList.filter((i) => i.id !== item.id);
            setShoppingList(updated);
            saveData(null, updated);
          }
        }
      ]
    );
  };

  const openEditShopModal = (item) => {
    setEditingShopItem(item);
    setEditShopName(item.name);
    setEditShopQty(item.qty.toString());
    setEditShopPrice(item.price > 0 ? item.price.toString().replace('.', ',') : '');
    setEditShopModalVisible(true);
  };

  const handleSaveEditShopItem = () => {
    if (!editShopName.trim()) {
      Alert.alert('Aviso', 'Digite o nome do item');
      return;
    }

    const qtyNum = parseFloat(editShopQty.replace(',', '.')) || 1;
    const priceNum = parseFloat(editShopPrice.replace(',', '.')) || 0;

    const updatedList = shoppingList.map((item) => {
      if (item.id === editingShopItem.id) {
        return {
          ...item,
          name: editShopName.trim(),
          qty: qtyNum,
          price: priceNum
        };
      }
      return item;
    });

    setShoppingList(updatedList);
    saveData(null, updatedList);
    setEditShopModalVisible(false);
    setEditingShopItem(null);
  };

  const getShoppingTotal = () => {
    return shoppingList.reduce((acc, item) => acc + item.qty * item.price, 0);
  };

  // Envio WhatsApp em formato JSON
  const handleSendWhatsApp = (phone) => {
    const jsonPayload = JSON.stringify(shoppingList, null, 2);
    const message = encodeURIComponent(`*Lista de Compras (JSON):*\n\`\`\`json\n${jsonPayload}\n\`\`\``);
    const url = `whatsapp://send?phone=55${phone}&text=${message}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erro', 'WhatsApp não instalado no dispositivo');
        }
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível abrir o WhatsApp'));

    setShareModalVisible(false);
  };

  const activeGroup = historyGroups.find((g) => g.id === activeGroupId) || historyGroups[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />

      {/* Navegação Topo (3 Abas) */}
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
          style={[styles.tabButton, activeTab === 'shopping' && styles.activeTabButton]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[styles.tabText, activeTab === 'shopping' && styles.activeTabText]}>
            Compras
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
        <ScrollView contentContainerStyle={styles.calcView} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>
              Lançando em: <Text style={styles.infoBadgeHighlight}>{activeGroup?.name || 'Geral'}</Text>
            </Text>
          </View>

          <TextInput
            style={[styles.noteInput, { minHeight: 65, textAlignVertical: 'top' }]}
            placeholder={'Cole o JSON recebido no WhatsApp aqui ou digite uma observação...'}
            placeholderTextColor="#5A5A72"
            value={note}
            onChangeText={setNote}
            multiline={true}
          />

          {/* Botão de Importar JSON */}
          <TouchableOpacity style={styles.importJsonBtn} onPress={handleImportJSONFromNote}>
            <Text style={styles.importJsonBtnText}>📥 Importar JSON para Lista de Compras</Text>
          </TouchableOpacity>

          <View style={styles.displayContainer}>
            <TextInput
              style={styles.displayText}
              value={display}
              onChangeText={setDisplay}
              placeholder="0 (opcional)"
              placeholderTextColor="#2E2E3A"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.addBtn]} onPress={() => handleSaveCalculation('ADD')}>
              <Text style={styles.actionBtnText}>+ Somar / Lançar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.subBtn]} onPress={() => handleSaveCalculation('SUB')}>
              <Text style={styles.actionBtnText}>- Subtrair / Lançar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keypad}>
            {['C', '÷', '×', '-', '7', '8', '9', '+', '4', '5', '6', '.', '1', '2', '3', ',', '0', '='].map((char) => {
              const isOp = ['+', '-', '×', '÷'].includes(char);
              const isClear = char === 'C';
              const isEqual = char === '=';

              return (
                <TouchableOpacity
                  key={char}
                  style={[styles.button, isOp && styles.opButton, isClear && styles.clearButton, isEqual && styles.equalButton]}
                  onPress={() => {
                    if (char === 'C') clearDisplay();
                    else if (char === '=') {
                      const res = evaluateExpression();
                      if (res !== null) setDisplay(res.toString().replace('.', ','));
                    } else handlePress(char);
                  }}
                >
                  <Text style={[styles.buttonText, isOp && styles.opButtonText, isClear && styles.clearButtonText, isEqual && styles.equalButtonText]}>
                    {char}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ABA 2: LISTA DE COMPRAS */}
      {activeTab === 'shopping' && (
        <View style={styles.historyView}>
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Total do Carrinho:</Text>
              <Text style={styles.totalValue}>
                R$ {getShoppingTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={() => setShareModalVisible(true)}>
              <Text style={styles.shareBtnText}>Compartilhar JSON</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shopForm}>
            <TextInput
              style={[styles.modalInput, { flex: 2, marginBottom: 0, marginRight: 6 }]}
              placeholder="Item (ex: Leite)"
              placeholderTextColor="#5A5A72"
              value={itemName}
              onChangeText={setItemName}
            />
            <TextInput
              style={[styles.modalInput, { flex: 0.8, marginBottom: 0, marginRight: 6 }]}
              placeholder="Qtd"
              placeholderTextColor="#5A5A72"
              keyboardType="numeric"
              value={itemQty}
              onChangeText={setItemQty}
            />
            <TextInput
              style={[styles.modalInput, { flex: 1.2, marginBottom: 0, marginRight: 6 }]}
              placeholder="R$ (opcional)"
              placeholderTextColor="#5A5A72"
              keyboardType="numeric"
              value={itemPrice}
              onChangeText={setItemPrice}
            />
            <TouchableOpacity style={styles.addShopItemBtn} onPress={handleAddShoppingItem}>
              <Text style={styles.btnText}>+</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={shoppingList}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sua lista de compras está vazia.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const itemTotal = item.qty * item.price;
              return (
                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                      {item.qty}x {item.name}
                    </Text>
                    <Text style={{ color: '#A0A0B2', fontSize: 12, marginTop: 2 }}>
                      {item.price > 0 ? `R$ ${item.price.toString().replace('.', ',')} un. | Subtotal: R$ ${itemTotal.toFixed(2).replace('.', ',')}` : 'Valor não informado'}
                    </Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditShopModal(item)}>
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleConfirmDeleteShopItem(item)}>
                      <Text style={styles.deleteBtnText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ABA 3: HISTÓRICOS */}
      {activeTab === 'history' && (
        <View style={styles.historyView}>
          <TouchableOpacity style={styles.createGroupBtn} onPress={() => setGroupModalVisible(true)}>
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
                    <Text style={[styles.chipText, isSelected && styles.activeChipText]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Total em {activeGroup?.name}:</Text>
              <Text style={styles.totalValue}>
                R$ {getGroupTotal(activeGroup).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <FlatList
            data={activeGroup?.items || []}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemType, item.type === 'SUB' ? styles.subText : styles.addText]}>
                    {item.type === 'SUB' ? '-' : '+'} R$ {item.value.toString().replace('.', ',')}
                  </Text>
                  <Text style={styles.itemNote}>{item.note}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL COMPARTILHAR WHATSAPP */}
      <Modal visible={shareModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar Lista JSON via WhatsApp</Text>
            <Text style={styles.label}>Escolha para quem deseja enviar:</Text>

            <TouchableOpacity style={styles.contactBtn} onPress={() => handleSendWhatsApp('48988045622')}>
              <Text style={styles.contactBtnText}>Enviar para Bruno (48 98804-5622)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={() => handleSendWhatsApp('49999450974')}>
              <Text style={styles.contactBtnText}>Enviar para Fernanda (49 99945-0974)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn, { width: '100%', marginTop: 10 }]} onPress={() => setShareModalVisible(false)}>
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR ITEM DA LISTA DE COMPRAS */}
      <Modal visible={editShopModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Item da Lista</Text>

            <Text style={styles.label}>Nome do Item:</Text>
            <TextInput style={styles.modalInput} value={editShopName} onChangeText={setEditShopName} />

            <Text style={styles.label}>Quantidade:</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={editShopQty} onChangeText={setEditShopQty} />

            <Text style={styles.label}>Valor Unitário (R$):</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="0,00" value={editShopPrice} onChangeText={setEditShopPrice} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditShopModalVisible(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveEditShopItem}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CRIAR HISTÓRICO */}
      <Modal visible={groupModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Histórico</Text>
            <TextInput style={styles.modalInput} placeholder="Nome" value={newGroupName} onChangeText={setNewGroupName} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setGroupModalVisible(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={() => setGroupModalVisible(false)}>
                <Text style={styles.btnText}>Criar</Text>
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
  tabContainer: { flexDirection: 'row', backgroundColor: '#16161E', marginHorizontal: 12, borderRadius: 14, padding: 4, marginBottom: 10 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTabButton: { backgroundColor: '#232330' },
  tabText: { color: '#5A5A72', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#6C5CE7' },

  calcView: { paddingHorizontal: 16, paddingBottom: 20 },
  infoBadge: { alignSelf: 'flex-end', backgroundColor: '#16161E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  infoBadgeText: { color: '#8E8EA0', fontSize: 12 },
  infoBadgeHighlight: { color: '#6C5CE7', fontWeight: 'bold' },
  noteInput: { backgroundColor: '#16161E', color: '#FFF', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 8, borderWidth: 1, borderColor: '#232330' },
  
  importJsonBtn: { backgroundColor: '#232330', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#6C5CE7' },
  importJsonBtnText: { color: '#6C5CE7', fontWeight: 'bold', fontSize: 12 },

  displayContainer: { backgroundColor: '#16161E', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#232330', minHeight: 75, justifyContent: 'center' },
  displayText: { color: '#FFF', fontSize: 34, textAlign: 'right', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { width: '48%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  addBtn: { backgroundColor: '#10B981' },
  subBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '22%', backgroundColor: '#16161E', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#232330' },
  buttonText: { color: '#E4E4E8', fontSize: 22, fontWeight: '500' },
  opButton: { backgroundColor: '#232330' },
  opButtonText: { color: '#6C5CE7', fontWeight: 'bold' },
  clearButton: { backgroundColor: '#2A171A' },
  clearButtonText: { color: '#EF4444' },
  equalButton: { width: '48%', backgroundColor: '#6C5CE7' },
  equalButtonText: { color: '#FFF', fontWeight: 'bold' },

  historyView: { flex: 1, paddingHorizontal: 16 },
  shopForm: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  addShopItemBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  shareBtn: { backgroundColor: '#25D366', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  shareBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  contactBtn: { backgroundColor: '#232330', padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#25D366' },
  contactBtnText: { color: '#FFF', fontWeight: 'bold', textAlign: 'center' },

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

  itemCard: { backgroundColor: '#16161E', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#232330' },
  itemType: { fontSize: 16, fontWeight: 'bold' },
  addText: { color: '#10B981' },
  subText: { color: '#EF4444' },
  itemNote: { color: '#A0A0B2', fontSize: 13, marginTop: 4 },

  itemActions: { flexDirection: 'row', marginLeft: 8 },
  editBtn: { backgroundColor: '#232330', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 6 },
  editBtnText: { color: '#8E8EA0', fontSize: 11, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#2A171A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { color: '#EF4444', fontSize: 11, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#5A5A72', fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#16161E', width: '85%', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#232330' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  label: { color: '#8E8EA0', fontSize: 12, marginBottom: 6 },
  modalInput: { backgroundColor: '#0D0D12', color: '#FFF', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#232330' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { padding: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#232330' },
  confirmBtn: { backgroundColor: '#6C5CE7' },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});
