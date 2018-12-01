/**
 * @author Балабанов А.Г.
 */
define('Events/BaseCard/Participants', [
   'Lib/Control/CompoundControl/CompoundControl',
   'tmpl!Events/BaseCard/Participants',
   'Core/CommandDispatcher',
   'Core/EventBus',
   'Core/Deferred',
   'WS.Data/Chain',
   'WS.Data/Query/Query',
   'WS.Data/Entity/Record',
   'WS.Data/Collection/RecordSet',
   'WS.Data/Source/SbisService',
   'Events/BaseCard/Participants/Model',
   'Events/BaseCard/Participants/utils',
   'tmpl!Events/BaseCard/Participants/templates/folder',
   'css!Events/BaseCard/Participants',
   'i18n!Events/BaseCard/Participants'
], function(
   CompoundControl,
   dotTpl,
   CommandDispatcher,
   EventBus,
   Deferred,
   Chain,
   Query,
   Record,
   RecordSet,
   SbisService,
   ParticipantsModel,
   participantsUtils
) {
   'use strict';

   var subscriberDS = new SbisService({
      endpoint: 'Subscriber'
   });

   // Базовые данные дефолтных папок
   var DEFAULT_FOLDERS_DATA = {
      'not-completed-confirmed': {
         folderId: 'not-completed-confirmed',
         title: rk('Подтвердили участие'),
         default: true,
         forCompleted: false,
         visibleUserStatus: false,
         dataFilter: {
            MeetingMember: true,
            SelfInvited: null,
            MembersOnly: true
         }
      },
      'not-completed-invited': {
         folderId: 'not-completed-invited',
         title: rk('Приглашены'),
         default: true,
         forCompleted: false,
         visibleUserStatus: false,
         dataFilter: {
            MeetingMember: null,
            SelfInvited: false,
            MembersOnly: true,
            Speaker: false
         }
      },
      'not-completed-refused': {
         folderId: 'not-completed-refused',
         title: rk('Отказались'),
         default: true,
         forCompleted: false,
         visibleUserStatus: false,
         dataFilter: {
            MeetingMember: false,
            SelfInvited: false,
            MembersOnly: true
         }
      },
      'completed-participate': {
         folderId: 'completed-participate',
         title: rk('Участвовали'),
         default: true,
         forCompleted: true,
         visibleUserStatus: false,
         dataFilter: {
            Attended: true,
            SelfInvited: null,
            MembersOnly: true
         }
      },
      'completed-not-participate': {
         folderId: 'completed-not-participate',
         title: rk('Не участвовали'),
         default: true,
         forCompleted: true,
         visibleUserStatus: false,
         dataFilter: {
            Attended: false,
            SelfInvited: null,
            MembersOnly: true,
            Speaker: false
         }
      },
      'admins': {
         folderId: 'admins',
         title: rk('Модераторы'),
         default: true,
         forCompleted: null,
         visibleUserStatus: true,
         dataFilter: {
            AdminsOnly: true,
            Speaker: false,
            Inheritance: true
         }
      },
      'speakers': {
         folderId: 'speakers',
         title: rk('Выступающие'),
         default: true,
         forCompleted: null,
         visibleUserStatus: true,
         dataFilter: {
            AdminsOnly: false,
            Speaker: true,
            Inheritance: true
         }
      }
   };

   // Папки которые отображаются в горизонтальном режиме
   var FOLDERS_HORIZONTAL = {
      admins: true,
      speakers: true
   };

   // Рекорд папки
   var FOLDER_RECORD = new Record({
      adapter: 'adapter.sbis',
      idProperty: 'folderId',
      format: {
         folderId: 'string',
         title: 'string',
         default: 'boolean',
         forCompleted: 'boolean',
         userCount: 'integer',
         userItems: 'recordset',
         dataFilter: 'object',
         pageSize: 'integer',
         infiniteScroll: 'string',
         visibleUserStatus: 'boolean'
      }
   });

   // Рекорсед папок
   var FOLDER_RS = new RecordSet({
      adapter: 'adapter.sbis',
      idProperty: 'folderId',
      format: FOLDER_RECORD.getFormat()
   });

   // Дефолтный фильтр поиска
   var SEARCH_FILTER_DEFAULT = {
      SubscriberSearch: '',
      SelfInvited: null,
      InvitedByEmail: null
   };

   // Различные классы
   var
      HORIZONTAL_LIST_CSS = 'events-BaseCardParticipants__horizontal-folders-list',
      LOADING_CSS = 'events-BaseCardParticipants--loading';

   var Participants = CompoundControl.extend({
      _dotTplFn: dotTpl,

      $protected: {
         _options: {

            // Id события
            eventId: null,

            // Тип события
            eventType: null,

            //тип события
            eventAccessType: null,

            // Статус публикации события
            published: null,

            // Статус завершенности события
            completed: null,

            // Кол-во участников в папках на разводящей
            pageSize: 9,

            // Кол-во участников в папке с бесконечным скролом
            pageSizeInfinity: 60,

            // Права на действия с папками и участниками
            permissions: {
               canUserAdd: true,
               canUserDelete: true,
               canUserMove: true,
               canFolderAdd: true,
               canFolderEdit: true,
               canFolderDelete: true,
               canAddModerator: true,
               canAddSpeaker: true,
               canBanUser: true,
               canExport: true
            },

            // Открыт публичный лендинг
            publicLanding: false,

            // Открыт лендинг
            landing: false
         },

         // Id предыдущей области
         _prevAreaId: undefined,

         // Идет загрузка или нет
         _loading: false
      },

      _modifyOptions: function() {
         var options = Participants.superclass._modifyOptions.apply(this, arguments);
         options.fastFilterValues = getFastFilterValues(options.published);
         return options;
      },

      $constructor: function() {
         this.getLinkedContext().setValueSelf('participants', {
            permissions: this._options.permissions,
            userFilter: Object.assign({}, SEARCH_FILTER_DEFAULT),
            emptyTextVisible: false
         });
      },

      // Инициализация
      init: function() {
         Participants.superclass.init.apply(this, arguments);

         // Компоненты
         this._controls = {
            backButtonHome: this.getChildControlByName('BackButtonHome'),
            backButtonHomeMain: this.getChildControlByName('BackButtonHomeMain'),
            backButtonMainArea: this.getChildControlByName('BackButtonMainArea'),
            backButtonFoldersAll: this.getChildControlByName('BackButtonFoldersAll'),
            horizontalFolders: this.getChildControlByName('HorizontalFoldersList'),
            verticalFolders: this.getChildControlByName('VerticalFoldersList'),
            folderOpenedList: this.getChildControlByName('OpenedFolderUserList'),
            addFolder: this.getChildControlByName('FolderAdd'),
            searchList: this.getChildControlByName('SearchList'),
            searchForm: this.getChildControlByName('SearchForm'),
            userInvite: this.getChildControlByName('UserInvite'),
            switchArea: this.getChildControlByName('SwitchArea'),
            exportToExcel: this.getChildControlByName('ExportToExcel'),
            fastFilter: this.getChildControlByName('FastFilter')
         };

         // Обновляем видимость
         this._updateAddMenu();
         this._updateToolbarButtonsVisible();
         this._updateBreadCrumbs();
         this._updateRootFolders();

         // Cобытия и команды
         this._setItemsActions();
         this._bindCommands();
         this._bindHandlers();
      },

      /**
       * Биндим обработчики на события
       * @returnds {*}
       * @private
       */
      _bindHandlers: function() {

         // Перед сменой областей сохраняем id текущей вкладки
         this.subscribeTo(this._controls.switchArea, 'onBeforeChangeActiveArea', this._onBeforeChangeActiveArea.bind(this));

         // После сменой областей сохраняем id текущей вкладки
         this.subscribeTo(this._controls.switchArea, 'onAfterChangeActiveArea', this._onAfterChangeActiveArea.bind(this));

         // При загрузке участников в открытой папке, обновляем папку на разводящей
         this.subscribeTo(this._controls.folderOpenedList, 'onDataLoad', this._onUpdateFolderOpened.bind(this));

         // Если юзер меняет ответ участия в событии
         this.subscribeTo(EventBus.channel('WebinarChannel'), 'onAnswerChanged', this._onAnswerChanged.bind(this));

         // Обновление папки или всех корневых папок если она там есть
         this.subscribeTo(EventBus.channel('WebinarChannel'), 'onParticipantsUpdate', this._onParticipantsUpdate.bind(this));

         // Завершение загрузки записей в списке поиска
         this.subscribeTo(this._controls.searchList, 'onDataLoad', this._onSearchDataLoad.bind(this));

         // Нажатие кнопки поиска
         this.subscribeTo(this._controls.searchForm, 'onSearch', this._onSearchName.bind(this));

         // Нажатие на кнопку сброса поиска (крестик)
         this.subscribeTo(this._controls.searchForm, 'onReset', this._onSearchName.bind(this));

         // Скрываем кнопки на которые юзеру нет прав
         this.subscribeTo(this._controls.horizontalFolders, 'onChangeHoveredItem', this._onChangeHoveredItem.bind(this));
         this.subscribeTo(this._controls.verticalFolders, 'onChangeHoveredItem', this._onChangeHoveredItem.bind(this));

         // Приглашаем пользователя по клику на кнопку "+" в тулбаре
         this.subscribeTo(this._controls.userInvite, 'onMenuItemActivate', this._onAddMenuItemActivate.bind(this));

         // Изменение полей в контексте
         this.subscribeTo(this.getLinkedContext(), 'onFieldChange', this._onContextChanged.bind(this));
      },

      /**
       * Публикуем команды
       * @private
       */
      _bindCommands: function() {
         var self = this;

         // Объявляем команду открытия назад, не прерываем т.к. выше есть обработчик
         CommandDispatcher.declareCommand(this, 'switchToMain', function() {
            self._setSwitchAreaAllFolders();
         });

         // Объявляем команду открытия области разводящей
         CommandDispatcher.declareCommand(this, 'switchToFoldersAll', function() {
            self._setSwitchAreaAllFolders();
            return true;
         });

         // Объявляем команду открытия папки
         CommandDispatcher.declareCommand(this, 'openFolder', function(folderId) {
            self._openFolder(folderId);
            return true;
         });

         // Регистрируем команду для добавления пользователя в группу
         CommandDispatcher.declareCommand(this, 'addParticipantToFolder', function(data) {
            participantsUtils.addSbisUserToParticipants({
               opener: this,
               eventId: self._options.eventId,
               isOnlyEmployees: self.isOnlyEmployees(),
               folderId: data.record.get('folderId')
            });
            return true;
         });

         // Регистрируем команду для создания папки
         CommandDispatcher.declareCommand(this, 'createFolder', function() {
            self._showDialogCreateFolder();
            return true;
         });

         // Регистрируем команду для переименования папки
         CommandDispatcher.declareCommand(this, 'renameFolder', function(data) {
            self._showDialogRenameFolder(data.key);
            return true;
         });

         // Регистрируем команду для удаления папки
         CommandDispatcher.declareCommand(this, 'deleteFolderConfirm', function(data) {
            self._showConfirmFolderDelete(data.record);
            return true;
         });

         // Регистрируем команду для выгрузки списка участников
         CommandDispatcher.declareCommand(this, 'exportToExcel', function() {
            self._showPanelExportExel();
            return true;
         });
      },

      /**
       * Колбэк изменения области
       * @param e {Core/EventObject}
       * @param currentArea {String} - имя области
       * @private
       */
      _onChangeActiveArea: function(e, currentArea) {
         this._prevAreaId = currentArea.getId();
      },

      /**
       * Колбэк до смены активной области
       * @param e {Core/EventObject} - Объект события
       * @param currentArea {SBIS3.CONTROLS/SwitchableAreaItem} - Итем области
       * @private
       */
      _onBeforeChangeActiveArea: function(e, currentArea) {
         this._prevAreaId = currentArea.getId();
      },

      /**
       * Колбэк после смены активной области
       * @private
       */
      _onAfterChangeActiveArea: function() {
         this._updateBreadCrumbs();
         this._updateToolbarButtonsVisible();
         this._updateAddMenu();
      },

      /**
       * Колбэк обновления списка участников в открытой папке
       * Здесь полученные итемы вставляем в разводящую, что бы списки были одинаковые всегда
       * @param e {Core/EventObject} - Объект события
       * @param items {WS.Data/Collection/RecordSet} - Список участников в папке
       * @private
       */
      _onUpdateFolderOpened: function(e, items) {
         var
            folder = this._getOpenedFolder(),
            folderItems,
            folderItemsCount,
            itemsNew;

         if (!folder) {
            return;
         }

         folderItems = folder.get('userItems');
         folderItemsCount = folderItems && folderItems.getCount() || 0;
         itemsNew = items.clone();
         itemsNew.assign(Chain(items).first(Math.max(folderItemsCount, this._options.pageSize)).value());
         itemsNew.setMetaData(Object.assign({}, items.getMetaData()));

         folder.set({
            userItems: itemsNew,
            userCount: itemsNew.getMetaData().total
         });
      },

      /**
       * Колбэк смены ответа об участии в событии
       * @param e {Core/EventObject} - Объект события
       * @param eventId {String} - Id события
       * @private
       */
      _onAnswerChanged: function(e, eventId) {
         if (eventId !== this._options.eventId) {
            return;
         }

         // Обновляем разводящую
         this._updateRootFolders(true);

         // Обновляем открытую папку если она сейчас отображена, иначе чистим ее
         if (this.isCurrOpenedFolderArea()) {
            this._controls.folderOpenedList.reload();
         } else {
            this._clearFolderOpenedList();
         }
      },

      /**
       * Колбэк обновления участников в папке
       * @param e {Core/EventObject} - Объект события
       * @param folderId {String} - Id папки
       * @private
       */
      _onParticipantsUpdate: function(e, folderId) {
         // Обновляем открытую папку
         if (!folderId || this._getOpenedFolderId() === folderId || this.isOpenedFolderDefault() && folderId === this._options.eventId) {
            // Если сейчас показана область открытой папки, но обновляем ее, иначе чистим ее
            if (this.isCurrOpenedFolderArea()) {
               this._controls.folderOpenedList.reload();
            } else {
               this._clearFolderOpenedList();
            }
         }

         // Обновляем список на разводящей
         this._updateRootFolders(true);

         // Обновим участников в ленте документа
         EventBus.channel('MeetingsChannel').notify('onMembersListChanged');
      },

      /**
       * Колбэк ховера по итему папки на разводящей
       * Изменяем действия над папкой в зависимости от прав
       * @param e {Core/EventObject} - Объект события
       * @param folder {WS.Data/Entity/Record} - Рекорд папки
       * @private
       */
      _onChangeHoveredItem: function(e, folder) {
         if (folder.key === null) {
            return;
         }

         var
            actions = e.getTarget().getItemsActions().getItemsInstances(),
            isNotDefault = !folder.record.get('default'),
            permissions = this._options.permissions;

         actions['AddParticipantToFolder'].toggle(isNotDefault && permissions.canUserAdd);
         actions['DeleteParticipantsFolder'].toggle(isNotDefault && permissions.canFolderDelete);
         actions['RenameParticipantsFolder'].toggle(isNotDefault && permissions.canFolderEdit);
      },

      /**
       * Выбор пункта меню у кнопки добавить участника
       * @param e {Core/EventObject} - Объект события
       * @param id {String} - Id пункта меню
       * @private
       */
      _onAddMenuItemActivate: function(e, id) {
         var folderId;

         if (id === 'sbis') {
            if (this.isCurrOpenedFolderArea() && !this.isOpenedFolderDefault()) {
               folderId = this._getOpenedFolderId();
            }
            participantsUtils.addSbisUserToParticipants({
               opener: this,
               eventId: this._options.eventId,
               isOnlyEmployees: this.isOnlyEmployees(),
               folderId: folderId
            });
         } else if (id === 'email') {
            participantsUtils.addUserToParticipantsByEmail({
               opener: this,
               eventId: this._options.eventId,
               eventType: this._options.eventType,
               published: this._options.published
            });
         }
      },

      /**
       * Загрузка итемов в поиске завершено
       * @param e {Core/EventObject}
       * @param items {WS.Data/Collection/RecordSet}
       * @private
       */
      _onSearchDataLoad: function(e, items) {
         if (!items.getCount()) {
            this._controls.searchList.setEmptyHTML(rk('Участников с выбранными параметрами не найдено'));
         }
      },

      /**
       * Обработчик изменения полей контекста
       * @param e {Core/EventObject}
       * @param field {*} - Поле контекста
       * @param value {*} - Новое значение
       * @private
       */
      _onContextChanged: function(e, field) {
         if (/^participants\/userFilter/.test(field)) {
            this._search();
         }
      },

      /**
       * Обработчик начала поиска по имени
       * @param e {Core/EventObject}
       * @param searchStr {String} - Строка поиска
       * @private
       */
      _onSearchName: function(e, searchStr) {
         this.getLinkedContext().setValueSelf('participants/userFilter/SubscriberSearch', searchStr || '');
      },

      /**
       * Обновить варианты добавления участников
       * @private
       */
      _updateAddMenu: function() {
         var itemsInviteMenu = [{
            id: 'sbis',
            title: rk('Пользователя СБИС')
         }];

         // Если тип события не только для сотрудников и папка не открыта
         if (!this.isOnlyEmployees() && !this.isCurrOpenedFolderArea()) {
            itemsInviteMenu.push({
               id: 'email',
               title: rk('По e-mail')
            });
         }

         // Сохраняем пункты меню
         this._controls.userInvite.setItems(itemsInviteMenu);
      },

      /**
       * Обновить быстрый фильтр
       * @private
       */
      _updateFastFilter: function() {
         this._controls.fastFilter.setItems([{
            name: 'FastFilter',
            idProperty: 'value',
            displayProperty: 'title',
            multiselect: false,
            values: getFastFilterValues(this._options.published)
         }]);
      },

      /**
       * Обновляем хлебные крошки
       * @private
       */
      _updateBreadCrumbs: function() {
         var
            isFolder = this.isCurrOpenedFolderArea() || this.isCurrSearchArea() && this._prevAreaId === 'openedFolder',
            openedFolder = isFolder && this._getOpenedFolder(),
            title = openedFolder && openedFolder.get('title');

         this._controls.backButtonFoldersAll.setCaption(title);
         this._controls.backButtonFoldersAll.setVisible(!!title);
         this._controls.backButtonFoldersAll.setEnabled(!!title);
         this._controls.backButtonMainArea.setVisible(!title);
         this._controls.backButtonMainArea.setEnabled(!title);
         this._controls.backButtonHome.setVisible(!!title);
         this._controls.backButtonHome.setEnabled(!!title);
         this._controls.backButtonHomeMain.setVisible(!!title);
         this._controls.backButtonHomeMain.setEnabled(!!title);
      },

      /**
       * Обновить видимость кнопок в тулбаре
       * @private
       */
      _updateToolbarButtonsVisible: function() {
         var
            isAddFolderVisible = true,
            isUserAddVisible = true,
            permissions = this._options.permissions;

         // Если открыта папка
         if (this.isCurrOpenedFolderArea()) {
            isAddFolderVisible = false;
            isUserAddVisible = !this.isOpenedFolderDefault();
         }

         // Учитываем права юзера
         isAddFolderVisible = isAddFolderVisible && permissions.canFolderAdd;
         isUserAddVisible = isUserAddVisible && permissions.canUserAdd;

         // Сохраняем видимость кнопок
         this._controls.addFolder.setVisible(isAddFolderVisible);
         this._controls.addFolder.setEnabled(isAddFolderVisible);
         this._controls.userInvite.setVisible(isUserAddVisible);
         this._controls.userInvite.setEnabled(isUserAddVisible);
         this._controls.exportToExcel.setVisible(this._options.permissions.canExport);
         this._controls.exportToExcel.setEnabled(this._options.permissions.canExport);
      },

      /**
       * Обновить папки на разводящей
       * @param hideIndicator {Boolean} - Скрывать индикатор загрузки при обновлении?
       * @returns {*}
       * @private
       */
      _updateRootFolders: function(hideIndicator) {
         var
            self = this,
            foldersHorizontalItems = FOLDER_RS.clone(),
            foldersVerticalItems = FOLDER_RS.clone(),
            dataQuery;

         // Прерываем паралельные запросы
         if (this._isLoading()) {
            return;
         }

         dataQuery = new Query().where({
            Channel: this._options.eventId,
            IsCompleted: this._options.completed,
            maxGroupMembersCount: self._options.pageSize,
            WithLockedInfo: self._options.permissions.canBanUser
         });

         // Обновление началось
         this._toggleLoading(true, hideIndicator);

         // FIXME
         return new SbisService({
            endpoint: 'Subscriber',
            binding: {
               query: 'GetGroupMembers'
            }
         }).query(dataQuery).addCallback(function (result) {
            var members = self._context.getValue('membersAll');
            var a = [];
            members.each(m => a.push(m.get('Subscriber')));

            var names = {};
            members.each(m => { names[m.get('Subscriber')] = m.get("SubscriberName") });

            var d = new Deferred();

            fetch('/payments/get_debitor_list/', {
               method: 'POST',
               headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                  eventId: self._options.eventId,
                  members: a
               })
            }).then(r => r.json()).then(function (res) {
               var json = res;

               var records = [];
               var folders = result.getAll();
               folders.each(function (g) {
                  var rs = g.get('items');
                  rs.addField({name: 'amount', type: 'string'});
                  rs.addField({name: 'detailing', type: 'object'});
                  rs.each(function (r) {
                     records.push(r);
                  });
               });

               Object.keys(json).forEach(k => {
                  records.forEach(r => {
                     if (r.get('Subscriber') === k) {
                        r.set('amount', json[k].ammount);
                        var detailing = Object.keys(json[k].detail).map(d => ({name: names[d], amount: json[k].detail[d].ammount }))
                        r.set('detailing', detailing);
                     }
                  })
               });
               d.callback(folders);
            })
            return d;
         }).addCallback(function(result) {
            var
               foldersAll = result,
               foldersDefHorizontal = {},
               foldersDefVertical = {},
               foldersCustomVertical = [];

            // Распределяем по массивам
            Chain(foldersAll).each(function(folder) {
               var folderId = folder.get('uuid');

               if (DEFAULT_FOLDERS_DATA[folderId]) {
                  if (FOLDERS_HORIZONTAL[folderId]) {
                     foldersDefHorizontal[folderId] = folder;
                  } else {
                     foldersDefVertical[folderId] = folder;
                  }
               } else {
                  foldersCustomVertical.push({
                     folderId: folderId,
                     title: folder.get('name'),
                     default: false,
                     userItems: folder.get('items'),
                     userCount: folder.get('count'),
                     dataFilter: {
                        Channel: folderId,
                        WithLockedInfo: self._options.permissions.canBanUser,
                        MembersOnly: true,
                        Speaker: false
                     },
                     forCompleted: null,
                     pageSize: self._options.pageSize,
                     visibleUserStatus: true
                  });
               }
            });

            // Получаем рекордсет дефолтных папок
            foldersDefHorizontal = self._getDefaultFoldersRS(foldersDefHorizontal);
            foldersDefVertical = self._getDefaultFoldersRS(foldersDefVertical);

            // Получаем рекордсет кастомных папок
            foldersCustomVertical = getFoldersRS(foldersCustomVertical);

            // Вставляем полученные папки если в них есть хотя бы один пользователь
            foldersHorizontalItems.assign(foldersDefHorizontal);
            foldersVerticalItems.assign(foldersCustomVertical);
            foldersVerticalItems.append(foldersDefVertical);

            /**
             * Применяем модель участников
             * Делаем это тут потому что при вставке вложенные модели теряются
             */
            [foldersHorizontalItems, foldersVerticalItems].forEach(function(folders) {
               folders.each(function(folder) {
                  self._setParticipantsModelOnFolder(folder);
               });
            });

            // Если в вертикальном списке только одна папка - делаем ей подгрузку по вертикальному скролу
            if (foldersVerticalItems.getCount() === 1) {
               foldersVerticalItems.at(0).set({
                  pageSize: self._options.pageSizeInfinity,
                  infiniteScroll: true
               });
            }

            // Вставляем итемы в разметку
            self._controls.verticalFolders.setItems(foldersVerticalItems);
            self._controls.horizontalFolders.setItems(foldersHorizontalItems);

            self._updateHorizontalColumns();
            self._updateEmptyText();

            return {
               foldersHorizontalItems: foldersHorizontalItems,
               foldersVerticalItems: foldersVerticalItems,
               foldersDefHorizontal: foldersDefHorizontal,
               foldersDefVertical: foldersDefVertical,
               foldersCustomVertical: foldersCustomVertical
            };
         }).addErrback(function(error) {
            // Сообщаем об ошибке
            participantsUtils.showMessageDialog({
               message: error.message,
               details: rk('Попробуйте выполнить операцию позднее'),
               status: 'error'
            });
            return error;
         }).addBoth(function(result) {
            self._toggleLoading(false);
            return result;
         });
      },

      /**
       * Обновить вид колонок в горизонтальном списке
       * @private
       */
      _updateHorizontalColumns: function() {
         var
            list = this._controls.horizontalFolders,
            folders = list.getItems(),
            leftCount = folders.at(0) ? folders.at(0).get('userItems').getCount() : 0,
            rightCount = folders.at(1) ? folders.at(1).get('userItems').getCount() : 0;

         list.getContainer().toggleClass(HORIZONTAL_LIST_CSS + '--' + 'left-small', !!leftCount && leftCount <= rightCount);
         list.getContainer().toggleClass(HORIZONTAL_LIST_CSS + '--' + 'right-small', !!rightCount && leftCount >= rightCount);
      },

      /**
       * Обновить видимость надписи "Ничего не найдено"
       * @private
       */
      _updateEmptyText: function() {
         var
            ctx = this.getLinkedContext(),
            hItems = this._controls.horizontalFolders.getItems(),
            vItems = this._controls.verticalFolders.getItems(),
            hVisible = !!(hItems && hItems.getCount()),
            vVisible = !!(vItems && vItems.getCount());

         ctx.setValueSelf('participants/emptyTextVisible', !hVisible && !vVisible);
      },

      /**
       * Удалить папку
       * @param folder {WS.Data/Entity/Record} - Рекорд папки
       * @param userSave {Boolean} - При true сохраняем юзеров (переносит в корень события, точнее в одну из дефолтных папок)
       * @returns {Deferred}
       * @private
       */
      _deleteFolder: function(folder, usersSave) {
         var
            self = this,
            folderId = folder.get('folderId'),
            sbisDeferred;

         sbisDeferred = subscriberDS.call('DeleteFolder', {
            meeting_id: this._options.eventId,
            folder_id: folderId,
            preserve_members: !!usersSave
         }).addCallback(function(result) {

            // Удаляем папку из спика корневых папок
            self._controls.verticalFolders.getItems().remove(folder);

            // Если удалена открытая папка - открываем разводящую
            if (self.isCurrOpenedFolderArea() && self._getOpenedFolderId() === folderId) {
               self._setSwitchAreaAllFolders();
            }

            // Если юзеры сохранились, то генерим событие, что бы обновились все дефолтные папки
            if (usersSave) {
               EventBus.channel('WebinarChannel').notify('onParticipantsUpdate', self._options.eventId);
            }
            return result;
         }).addErrback(function(error) {
            participantsUtils.showMessageDialog({
               status: 'error',
               message: error.message
            });
            return error;
         });

         participantsUtils.showWaitIndicator(rk('Загрузка...'), sbisDeferred);
         return sbisDeferred;
      },

      /**
       * Поиск
       * @private
       */
      _search: function() {
         var
            filterFull = {
               Channel: this._options.eventId,
               Inheritance: true
            },
            searchFormFocused = this._isSearchFormFocused(),
            filterUpdated = false,
            userFilter = Object.assign({}, SEARCH_FILTER_DEFAULT, this.getLinkedContext().getValueSelf('participants/userFilter')),
            validFilter = {};

         // Из разметки прилетают другие значение => Переделываем в нужные
         validFilter['SelfInvited'] = this._getFastFilterInvited(userFilter['fastFilter']);
         validFilter['InvitedByEmail'] = userFilter['fastFilter'] === 'external' ? true : null;
         validFilter['SubscriberSearch'] = userFilter['SubscriberSearch'] || '';

         // Смотрим есть ли отличие от базовых параметров
         for (var i in validFilter) {
            if (validFilter.hasOwnProperty(i)) {
               if (filterUpdated || SEARCH_FILTER_DEFAULT[i] !== validFilter[i]) {
                  filterUpdated = true;
               }
            }
         }

         if (filterUpdated) {
            this._controls.searchList.setVisibleUserAnswer(this._options.published && (!this._options.completed || this._options.eventType === 3));
            this._controls.searchList.setVisibleUserAttended(this._options.published && this._options.completed && this._options.eventType !== 3);

            // Если открыта папка, то берем из нее параметры фильтра
            if (this.isCurrOpenedFolderArea()) {
               this._controls.searchList.setItems(this._controls.folderOpenedList.getItems().clone());
               Object.assign(filterFull, this._controls.folderOpenedList.getDataFilter());
            } else if (this.isCurrSearchArea()) {
               Object.assign(filterFull, this._controls.searchList.getDataFilter());
            } else {
               this._controls.searchList.clearItems();
            }

            Object.assign(filterFull, validFilter);
            this._controls.searchList.setEmptyHTML('');
            this._controls.searchList.setHighlightText(filterFull['SubscriberSearch'] || '', false);
            this._controls.searchList.setDataFilter(filterFull);
            this._setSwitchAreaSearch();
         } else if (this.isCurrSearchArea() && this._prevAreaId) {
            this._controls.switchArea.setActiveArea(this._prevAreaId);
         }

         // При смене switchArea сбрасывается фокус в форме поиска
         if (searchFormFocused) {
            this._setSearchFormFocused();
         }
      },

      /**
       * Сбросить поиск
       * @private
       */
      _searchReset: function() {
         this._controls.searchList.clearItems();
         this._controls.searchList.setEmptyHTML('');
         this.getLinkedContext().setValueSelf('participants/userFilter', SEARCH_FILTER_DEFAULT);
      },

      /**
       * Создать папку по имени
       * @param name {String}
       * @return {WS.Data/Entity/Record}
       * @private
       */
      _createFolderByName: function(name) {
         var self = this;
         return subscriberDS.call('CreateFolder', {
            meeting_id: this._options.eventId,
            folder_name: name
         }).addCallback(function(dataSet) {
            var folderId =  dataSet.getRow().get('Folder');

            // Возвращаем дефер с готовым рекордом папки
            return getFolderRecord({
               folderId: folderId,
               title: name,
               dataFilter: {
                  Channel: folderId
               },
               // Без формата рекордсет в сырых данных - null
               userItems: new RecordSet({
                  adapter: 'adapter.sbis',
                  format: {
                     Subscriber: 'String'
                  }
               }),
               userCount: 0
            });
         }).addErrback(function(error) {
            // Сообщение об ошибке
            participantsUtils.showMessageDialog({
               message: error.message,
               opener: self,
               status: 'error'
            });
            return error;
         });
      },

      /**
       * Очистить выбранную папку до пустого состояния
       * @private
       */
      _clearFolderOpenedList: function() {
         this._controls.folderOpenedList.clearItems();
         this._controls.folderOpenedList.setDataFilter(undefined, true);
         this._setOpenedFolder(null);
      },

      /**
       * Открыть папку участников
       * Если передать не корректный id приводящий к false или если указанной папки нет, то откроется область с корневыми папками
       * @param folderId {string|undefined}
       * @param [forceUpdate] {boolean} - если нужно принудительно обновить открываемую папку
       */
      _openFolder: function(folderId, forceUpdate) {
         var
            self = this,
            folder = folderId && this._getFolderRecordById(folderId),
            newFolder = folderId !== this._getOpenedFolderId(),
            setEmptyHTML = function setEmptyHTML(text) {
               text = typeof text === 'undefined' ? rk('В этой папке нет участников') : text;
               self._controls.folderOpenedList.setEmptyHTML(text);
            },
            dataFilter;

         // Пробуем открыть папку
         if (folder) {
            this._controls.folderOpenedList.setVisibleUserAnswer(this._options.published && (!this._options.completed || this._options.eventType === 3) && folder.get('visibleUserStatus'));
            this._controls.folderOpenedList.setVisibleUserAttended(this._options.published && this._options.completed && this._options.eventType !== 3 && folder.get('visibleUserStatus'));

            if (forceUpdate || newFolder) {
               if (newFolder) {
                  this._clearFolderOpenedList();
               }

               // Чистим текст, т.к. он показывается при очистке списка во время загрузки с БЛа
               setEmptyHTML('');

               // Отписываемся от возможного события
               this.unsubscribeFrom(this._controls.folderOpenedList, 'onDataLoad', setEmptyHTML);

               // Возвращаем дефолтный текст после получения итемов
               this.subscribeOnceTo(this._controls.folderOpenedList, 'onDataLoad', setEmptyHTML);

               // Новый фильтр
               dataFilter = Object.assign({}, folder.get('dataFilter'));
               this._controls.folderOpenedList.setDataFilter(dataFilter);
               this._controls.searchList.setDataFilter(dataFilter, true);
            }

            // Сохраняем id открытой папки
            this._setOpenedFolder(folder);

            // Показываем область открытой папки
            this._setSwitchAreaOpenedFolder();
         } else {
            // Показываем область разводящей
            this._setSwitchAreaAllFolders();
         }

         // Обновим кнопку добавления участников в тулбаре
         this._updateAddMenu();

         // Видимость кнопок в тулбаре
         this._updateToolbarButtonsVisible();
      },

      /**
       * Переключатель налчия загрузки
       * @param loading
       * @private
       */
      _toggleLoading: function(loading, hideIndicator) {
         this._loading = loading;
         if (loading && !hideIndicator) {
            this._loadingIndicator = setTimeout(function() {
               this.getContainer().toggleClass(LOADING_CSS, true);
            }.bind(this), 300);
         } else {
            clearTimeout(this._loadingIndicator);
            this.getContainer().toggleClass(LOADING_CSS, false);
         }
      },

      /**
       * Показываем диалог создания папок
       * @private
       */
      _showDialogCreateFolder: function() {
         var self = this;
         self._showEditFolderDialog().addCallback(function(name) {
            // Создаем папку
            self._createFolderByName(name).addCallback(function(folderRecord) {
               // Вставляем папку в список
               self._controls.verticalFolders.getItems().prepend([folderRecord]);
            });
         });
      },

      /**
       * Переименование папки
       * @param folderId {String}
       * @private
       */
      _showDialogRenameFolder: function(folderId) {
         var
            self = this,
            folder =  this._getFolderRecordById(folderId),
            oldName = folder.get('title');

         // Показываем диалог редактирования папки
         self._showEditFolderDialog(oldName).addCallback(
            function(name) {
               if (name !== oldName) {
                  subscriberDS.call('RenameFolder', {
                     meeting_id: self._options.eventId,
                     folder_id: folderId,
                     new_folder_name: name
                  }).addCallback(function() {
                     folder.set('title', name);
                     if (!self.isCurrAllFoldersArea()) {
                        self._updateBreadCrumbs();
                     }
                  });
               }
            }
         );
      },

      /**
       * Показать диалог редактирования папки
       * @param defaultName {String}
       * @returns {*}
       * @private
       */
      _showEditFolderDialog: function(defaultName) {
         var
            self = this,
            def = new Deferred();

         require(['Lib/Control/Dialog/Dialog'], function(Dialog) {
            new Dialog({
               name: 'NameDialog',
               template: 'Events/BaseCard/Participants/FolderEditor',
               opener: self,
               componentOptions: {
                  subGroupName: defaultName
               },
               handlers: {
                  onBeforeClose: function(eventObject, name) {
                     if (name) {
                        def.callback(name);
                     } else {
                        def.errback(false);
                     }
                  }
               }
            });
         });

         return def;
      },

      /**
       * Показать окно подтверждения удаления папки
       * @param folder {WS.Data/Entity/Record} - Рекорд папки
       * @private
       */
      _showConfirmFolderDelete: function(folder) {
         var self = this;

         // Если есть участники (проверяем именно по контролу т.к. в рекорде мы ничего не обновляем)
         if (folder.get('userCount')) {
            showConfirmDialog({
               message: rk('Удалить группу вместе с участниками?'),
               details: rk('При выборе "Нет", участники из группы будут перенесены в общие списки участников.'),
               hasCancelButton: true
            }, function() {
               self._deleteFolder(folder);
            }, function() {
               self._deleteFolder(folder, true);
            });
         } else {
            showConfirmDialog({
               message: rk('Удалить группу?'),
               details: '',
               hasCancelButton: false
            }, function() {
               self._deleteFolder(folder);
            });
         }
      },

      /**
       * Открывает панель для экспорта участников
       * @private
       */
      _showPanelExportExel: function() {
         var serviceParams = {
            MethodName: 'Subscriber.GetMembers',
            Filter: Record.fromObject({
               Channel: this._options.eventId,
               FioFormat: true,
               Inheritance: true,
               SelfInvited: null,
               Speaker: false,
               MeetingMember: true,
               // чтобы email и телефоны нам отдали
               NeedContactInfo: true
            }, 'adapter.sbis'),
            Pagination: null,
            HierarchyField: '',
            FileName: rk('Участники')
         };

         require(['SBIS3.CONTROLS/ExportCustomizer/Action'], function(ExportAction) {
            new ExportAction({}).execute({
               skipCustomization: true,
               serviceParams: serviceParams,
               allFields: [{
                  title: 'ФИО',
                  id: 'SubscriberFullName'
               }, {
                  title: 'Участвовал',
                  id: 'AttendedStr'
               }, {
                  title: 'Email',
                  id: 'SubscriberEmail'
               }, {
                  title: 'Телефон',
                  id: 'MobilePhone'
               }, {
                  title: 'Компания',
                  id: 'SubscriberCompany'
               }, {
                  title: 'ИНН',
                  id: 'SubscriberCompanyINN'
               }],
               fieldIds: [
                  'SubscriberFullName',
                  'AttendedStr',
                  'SubscriberEmail',
                  'MobilePhone',
                  'SubscriberCompany',
                  'SubscriberCompanyINN'
               ],
               outputCall: {
                  endpoint: 'Excel',
                  method: 'SaveCustom',
                  args: serviceParams,
                  argsFilter: function(data) {
                     return {
                        Fields: data.fieldIds,
                        Titles: data.columnTitles,
                        TemplateId: data.fileUuid,
                        Sync: false
                     };
                  }
               }
            });
         });
      },

      /**
       * Загрузка идет?
       * @returns {Boolean}
       * @private
       */
      _isLoading: function() {
         return this._loading;
      },

      /**
       * Получить актуальное значение для поля фильтра SelfInvited
       * @param value {*}
       * @private
       */
      _getFastFilterInvited: function(value) {
         switch (value) {
            case 'invited':
               return false;
            case 'guests':
               return true;
            default:
               return null;
         }
      },

      /**
       * Получить запись папки по Id папки
       * Ищет в горизонтальном и вертикальном списках
       * @param folderId {String} - Id папки
       * @returns {WS.Data/Entity/Record|*} - рекорд папки
       * @private
       */
      _getFolderRecordById: function(folderId) {
         var
            horizontalItems = this._controls.horizontalFolders.getItems(),
            verticalFolders = this._controls.verticalFolders.getItems(),
            folder;

         [horizontalItems, verticalFolders].forEach(function(items) {
            folder = folder || items.getRecordById(folderId);
         });

         return folder;
      },

      /**
       * Получить рекордсет дефолтных папок в зависимости от статуса завершенности события
       * @param foldersDefault {Array}
       * @returns {WS.Data|Collection|RecordSet}
       * @private
       */
      _getDefaultFoldersRS: function(foldersDefault) {
         var
            completed = this._options.completed,
            canBanUser = this._options.permissions.canBanUser,
            dataFolders = [];

         for (var folderId in foldersDefault) {
            if (foldersDefault.hasOwnProperty(folderId)) {
               var
                  folder = foldersDefault[folderId],
                  folderData = DEFAULT_FOLDERS_DATA[folderId],
                  dataFilter;

               /**
                * Разный набор дефолтных папок в зависимости от завершенности события
                * Пустые папки игнорируем
                */
               if ((folderData.forCompleted === null || completed === folderData.forCompleted) && folder.get('count')) {
                  dataFilter = Object.assign({}, folderData.dataFilter);
                  dataFilter['WithLockedInfo'] = canBanUser;
                  dataFolders.push(Object.assign({}, folderData, {
                     userCount: folder.get('count'),
                     userItems: folder.get('items'),
                     dataFilter: dataFilter
                  }));
               }
            }
         }

         return getFoldersRS(dataFolders);
      },

      /**
       * Установить итемы действий над папками
       * @private
       */
      _setItemsActions: function() {
         [this._controls.horizontalFolders, this._controls.verticalFolders].forEach(function(folderList) {
            folderList.setItemsActions([{
               name: 'AddParticipantToFolder',
               icon: 'icon-24 icon-AddButton icon-primary',
               caption: rk('Добавить участника'),
               tooltip: rk('Добавить участника'),
               isMainAction: true,
               command: 'addParticipantToFolder'
            }, {
               name: 'RenameParticipantsFolder',
               icon: 'icon-24 icon-Edit icon-primary',
               caption: rk('Переименовать'),
               tooltip: rk('Переименовать'),
               isMainAction: true,
               command: 'renameFolder',
               className: 'events-BaseCardParticipants__folder-button-folder-rename'
            }, {
               name: 'DeleteParticipantsFolder',
               icon: 'icon-24 icon-Erase icon-error',
               caption: rk('Удалить'),
               tooltip: rk('Удалить'),
               isMainAction: true,
               command: 'deleteFolderConfirm',
               className: 'events-BaseCardParticipants__folder-button-folder-delete'
            }]);
         });
      },

      /**
       * Задать фокус на форму поиска
       * @returns {*}
       * @private
       */
      _isSearchFormFocused: function() {
         return this._controls.searchForm.isActive();
      },

      /**
       * Задать фокус на форму поиска
       * @private
       */
      _setSearchFormFocused: function() {
         this._controls.searchForm.activateFirstControl();
      },

      /**
       * Юзерам в папке применить модель
       * @param folder {WS.Data/Entity/Record}
       * @private
       */
      _setParticipantsModelOnFolder: function(folder) {
         var userItems = folder.get('userItems');
         if (userItems) {
            folder.set('userItems', new RecordSet({
               idProperty: 'Subscriber',
               adapter: userItems.getAdapter(),
               rawData: userItems.getRawData(),
               metaData: {
                  total: folder.get('userCount'),
                  more: folder.get('userCount') - userItems.getCount()
               },
               model: ParticipantsModel
            }));
         }
      },

      /**
       * Сохранить запись открытой папки
       * @param folder {WS.Data/Entity/Record}
       * @private
       */
      _setOpenedFolder: function(folder) {
         this._openedFolder = folder;
      },

      /**
       * Получить запись открытой папки
       * @returns {WS.Data/Entity/Record}
       * @private
       */
      _getOpenedFolder: function() {
         return this._openedFolder;
      },

      /**
       * Получить id открытой папки
       * @returns {String|*}
       * @private
       */
      _getOpenedFolderId: function() {
         var folder = this._getOpenedFolder();
         return folder && folder.getId();
      },

      /**
       * Открыть область разводящей
       * @private
       */
      _setSwitchAreaAllFolders: function() {
         this._controls.switchArea.setActiveArea('allFolders');
         this._searchReset(true);
      },

      /**
       * Открыть область открытой папки
       * @private
       */
      _setSwitchAreaOpenedFolder: function() {
         this._controls.switchArea.setActiveArea('openedFolder');
         this._searchReset(true);
      },

      /**
       * Открыть область поиска
       * @private
       */
      _setSwitchAreaSearch: function() {
         this._controls.switchArea.setActiveArea('search');
      },

      /**
       * Открыта дефолтная папка
       * @returns {Boolean}
       */
      isOpenedFolderDefault: function() {
         var folder = this._getOpenedFolder();
         return folder && folder.get('default');
      },

      /**
       * Открыта область корневых папок
       * @returns {Boolean}
       */
      isCurrAllFoldersArea: function() {
         return this._controls.switchArea.getCurrentAreaId() === 'allFolders';
      },

      /**
       * Открыта область папки
       * @returns {Boolean}
       */
      isCurrOpenedFolderArea: function() {
         return this._controls.switchArea.getCurrentAreaId() === 'openedFolder';
      },

      /**
       * Открыта область поиска
       * @returns {Boolean}
       */
      isCurrSearchArea: function() {
         return this._controls.switchArea.getCurrentAreaId() === 'search';
      },

      /**
       * Тип доступа "Только для сотрудников"
       * @returns {Boolean}
       */
      isOnlyEmployees: function() {
         return this._options.eventAccessType === 3;
      },

      /**
       * Сохранить тип доступа к событию
       * @param eventAccessType {Number}
       */
      setEventAccessType: function(eventAccessType) {
         if (this._options.eventAccessType !== eventAccessType) {
            this._options.eventAccessType = eventAccessType;
            this._notifyOnPropertyChanged('eventAccessType');
            this._updateAddMenu();
         }
      },

      /**
       * Сохранить права на работу с участниками и папками
       * @param permissions {Object}
       */
      setPermissions: function(permissions) {
         // Если было изменение
         if (this._options.permissions === permissions) {
            return;
         }

         var actualPermissions = permissions;
         if (this._options.readOnly) {
            Object.keys(actualPermissions).forEach(function(key) {
               actualPermissions[key] = false;
            });
         }

         this._options.permissions = actualPermissions;

         this.getLinkedContext().setValueSelf('participants/permissions', actualPermissions);
         this._notifyOnPropertyChanged('permissions');

         // Видимость кнопок в тулбаре
         this._updateToolbarButtonsVisible();
      },

      // Сохранить статус публикации
      setPublished: function(published, noRedraw) {
         if (this._options.published !== published) {
            this._options.published = published;
            this._updateFastFilter();
            this._controls.horizontalFolders.getProperty('templateBinding').published = published;
            this._controls.verticalFolders.getProperty('templateBinding').published = published;
            !noRedraw && this._controls.horizontalFolders.redraw();
            !noRedraw && this._controls.verticalFolders.redraw();
            this._notifyOnPropertyChanged('published');
         }
      },

      // Сохранить статус сохраненности
      setCompleted: function(completed, noRedraw) {
         if (this._options.completed !== completed) {
            EventBus.channel('WebinarChannel').notify('onParticipantsUpdate', this._options.eventId);
            this._options.completed = completed;
            this._controls.horizontalFolders.getProperty('templateBinding').completed = completed;
            this._controls.verticalFolders.getProperty('templateBinding').completed = completed;
            !noRedraw && this._controls.horizontalFolders.redraw();
            !noRedraw && this._controls.verticalFolders.redraw();
            this._notifyOnPropertyChanged('completed');
         }
      }
   });

   /**
    * Получить значения для быстрого фильтра
    * @param published {Boolean}
    * @returns {Array}
    * @private
    */
   function getFastFilterValues(published) {
      var values = [{
         value: 'all',
         title: rk('Все')
      }, {
         value: 'external',
         title: rk('Внешние пользователи')
      }];

      if (published) {
         values.splice(1, 0, {
            value: 'guests',
            title: rk('Гости')
         }, {
            value: 'invited',
            title: rk('Приглашенные')
         });
      }

      return values;
   }

   /**
    * Функция создания рекордсетов списка категорий
    * @param {Array} aDataFolders - список данных папок
    * @returns {WS.Data/Collection/RecordSet}
    */
   function getFoldersRS(aDataFolders) {
      var foldersRS = FOLDER_RS.clone();

      aDataFolders.forEach(function(folderData) {
         foldersRS.add(getFolderRecord(folderData));
      });

      // Возвращаем сформированный рекордсет
      return foldersRS;
   }

   /**
    * Получить рекорд папки
    * @param folderData {Object} - Данные папки
    * @return {WS.Data/Entity/Record}
    */
   function getFolderRecord(folderData) {
      var folderRecord = FOLDER_RECORD.clone();
      folderRecord.set(folderData);
      return folderRecord;
   }

   /**
    * Показать диалог подтверждения, обертка с предварительной загрузкой InformationPopupManager
    * @params см. параметры InformationPopupManager.showConfirmDialog
    */
   function showConfirmDialog() {
      var args = arguments;
      require(['SBIS3.CONTROLS/Utils/InformationPopupManager'], function(InformationPopupManager) {
         InformationPopupManager.showConfirmDialog.apply(InformationPopupManager, args);
      });
   }

   return Participants;
});
