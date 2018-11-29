define('Events/BaseCard',
   [
      //region base
      'Lib/Control/CompoundControl/CompoundControl',
      'tmpl!Events/BaseCard',
      //endregion
      //region Core
      'Core/CommandDispatcher',
      'Core/UserInfo',
      'Core/core-instance',
      'Core/RightsManager',
      'Core/core-merge',
      'Lib/ServerEvent/Bus',
      'Core/ContextBinder',
      //endregion
      //region WS.Data
      'WS.Data/Di',
      'WS.Data/Entity/Record',
      'WS.Data/Collection/RecordSet',
      'WS.Data/Source/SbisService',
      //endregion
      //region Events
      'Events/BaseCard/utils',
      'Events/Utils',
      //endregion
      //region resources
      'Webinars/Utils/_Internal/Parsers',
      'tmpl!Events/BaseCard/tmpls/about',
      'tmpl!Events/BaseCard/tmpls/sidebar',
      'css!Events/BaseCard'
      //endregion
   ],
   function(/*region args*/
      //region base
      CompoundControl,
      dotTplFn,
      //endregion
      //region Core
      CommandDispatcher,
      UserInfo,
      cInstance,
      RightsManager,
      cMerge,
      ServerEventBus,
      ContextBinder,
      //endregion
      //region WS.Data
      Di,
      Record,
      RecordSet,
      SbisService,
      //endregion
      //region Events
      eventsBaseCardUtils,
      eventsUtils,
      //endregion
      //region resources
      WebinarParsers
      //endregion
   /*endregion*/) {
      'use strict';

      /**
       * Базовая карточка события, отвечает за общую логику каточек вебинара и мероприятия
       *
       * @class Events/BaseCard
       * @extends Lib/Control/CompoundControl/CompoundControl
       * @author Уфимцев Дмитрий Юрьевич
       */
      var BaseCard = CompoundControl.extend({
         _dotTplFn: dotTplFn,
         $protected: {
            _options: {
               //region public
               /**
                * @cfg {Events/BaseCard/Model} Запись события
                */
               record: null,

               /**
                * @cfg {Boolean} Признак новой записи
                */
               isNewRecord: false,

               /**
                * @cfg {Boolean} true если открывается созданная копия события
                */
               isCopy: false,

               /**
                * @cfg {Boolean} Признак лендинга
                */
               isLanding: false,

               /**
                * @cfg {Boolean} Признак публичного лендинга (для незарегистрированных пользователей)
                */
               isGuest: UserInfo.get('guest'),

               /**
                * @cfg {String} Содержимое контента основной вкладки
                */
               aboutTmpl: 'tmpl!Events/BaseCard/tmpls/about',

               /**
                * @cfg {String} Содержимое sidebar
                */
               sidebarTmpl: 'tmpl!Events/BaseCard/tmpls/sidebar',

               /**
                * @cfg {String} Идентификатор вкладки, котороая должна быт показана при открытии карточки
                */
               defaultTabId: 'main',

               /**
                * @cfg {Boolean} true если при открытии карточку нужно проскролить основную область к комментариям
                */
               scrollToComments: false,

               /**
                * @cfg {Number} Ширина правого отступа шапки. Применяется только в случае когда выбран шаблон
                * "тема и дата на баннере". Т.к. в этом случае readonly меню наезжает на текст
                */
               headerRightMargin: 80,
               //endregion

               //region private
               /**
                * Права текущего пользователя относительно карточки события
                */
               _rights: null,
               // Имеет ли пользователь доступ к помещениям
               _readRoomAccess: !!(RightsManager.getRights(['Помещения'])['Помещения'] & RightsManager.READ_MASK),
               // Под демо режимом некоторый функционал ограничен
               _isDemo: UserInfo.get('isDemo'),
               // Замещающий текст для пустого списка комментариев
               _commentsEmptyHTML: ''
               //endregion
            }
         },

         //region life cycle hooks
         _modifyOptions: function() {
            var ops = BaseCard.superclass._modifyOptions.apply(this, arguments);

            // Преобразуем запись к нужной модели если она еще не в ней
            if (!cInstance.instanceOfModule(ops.record, eventsBaseCardUtils.modelModuleName)) {
               ops.record = Di.resolve(eventsBaseCardUtils.model, {
                  rawData: ops.record.getRawData(),
                  adapter: ops.record.getAdapter(),
                  idProperty: ops.record.getIdProperty()
               });
            }

            // Если создается новая запись, то проинициализируем её данными
            initCreationData(ops);

            /**
             * Если запрещено переводить в режим редактирования, то явно проставляем enabled иначе часть карточки
             * отображается в режиме редактирования для пользователя у которого нет прав на редактирование.
             * Да это какая-то магия, я так и не понял почему так, но это работает)
             * https://online.sbis.ru/opendoc.html?guid=ca6fa16f-80e6-46d9-8e64-573ce438050c
             */
            if (!ops.allowChangeEnable) {
               ops.enabled = false;
            }

            ops._rights = buildRights(ops.record, ops);
            ops._banner = WebinarParsers.parseLanding(ops.record.get('Landing')).banner;
            ops._commentsEmptyHTML = +ops.record.get('Type') === 2 ? rk('Этот вебинар пока никто не прокомментировал') : rk('Это мероприятие пока никто не прокомментировал');
            ops._blocksVisible = this._getBlocksVisible(ops.record, ops.enabled, ops.isGuest);

            return ops;
         },

         $constructor: function() {
            // Массив обработчиков, которые запустятся перед сохраненеием записи и если хотябы один упадет, то все сохранение упадет
            this._beforeSaveHandlers = [];
            // Массив обработчиков, которые запустятся перед перестроением карточки при смене шаблона
            this._beforeRebuildHandlers = [];
            // Массив обработчиков, которые запустятся после перестроением карточки при смене шаблона
            this._afterRebuildHandlers = [];
            // Массив обработчиков на смену состояния карточки (редактирование/просмотр)
            this._onChangeEditable = [];

            //region Команды для переключения контента карточки
            // Переключает контент карточки на основную вкладку
            CommandDispatcher.declareCommand(this, 'switchToMain', function() {
               this._switchBodyArea('main');
            });
            // Переключает контент карточки на список участников
            CommandDispatcher.declareCommand(this, 'switchToParticipants', function() {
               this._switchBodyArea('participants');
            });
            // Переключает контент карточки на список опросов
            CommandDispatcher.declareCommand(this, 'switchToInterviews', function() {
               this._switchBodyArea('interviews');
            });
            // Переключает контент карточки на список вопросов
            CommandDispatcher.declareCommand(this, 'switchToQuestions', function() {
               this._switchBodyArea('questions');
            });
            // Переключает контент карточки на список вопросов
            CommandDispatcher.declareCommand(this, 'switchToProductList', function() {
               this._switchBodyArea('productList');
            });
            //endregion

            //region Команды от внутренних блоков
            // Регистрируем ф-ии он внутренних структурных блоков, которые должны быть вызваны перед сохранением
            CommandDispatcher.declareCommand(this, 'regBeforeSaveHandler', function(handler) {
               this._beforeSaveHandlers.push(handler);
               return true;
            });
            // При дистроинге внутренних блоков удаляем их обработчики на beforeSave
            CommandDispatcher.declareCommand(this, 'unregBeforeSaveHandler', function(handler) {
               var i = this._beforeSaveHandlers.indexOf(handler);
               // Если обработчик не найден, то херня какая-то, ругаемся
               if (i < 0) {
                  throw 'Event/BaseCard: Попытка удаления не зарегистрированного обработчика на beforeSave';
               }

               this._beforeSaveHandlers.splice(i, 1);
               return true;
            });

            /**
             * Регистрируем ф-ии он внутренних структурных блоков, которые должны быть вызваны перед ребилдом карточки
             * при смене шаблона лендинга
             */
            CommandDispatcher.declareCommand(this, 'regBeforeRebuildHandler', function(handler) {
               this._beforeRebuildHandlers.push(handler);
               return true;
            });
            // При дистроинге внутренних блоков удаляем их обработчики на beforeRebuild
            CommandDispatcher.declareCommand(this, 'unregBeforeRebuildHandler', function(handler) {
               var i = this._beforeRebuildHandlers.indexOf(handler);
               // Если обработчик не найден, то херня какая-то, ругаемся
               if (i < 0) {
                  throw 'Event/BaseCard: Попытка удаления не зарегистрированного обработчика на beforeRebuild';
               }

               this._beforeRebuildHandlers.splice(i, 1);
               return true;
            });

            /**
             * Регистрируем ф-ии он внутренних структурных блоков, которые должны быть вызваны после ребилда карточки
             * при смене шаблона лендинга
             */
            CommandDispatcher.declareCommand(this, 'regAfterRebuildHandler', function(handler) {
               this._afterRebuildHandlers.push(handler);
               return true;
            });
            // При дистроинге внутренних блоков удаляем их обработчики на afterRebuild
            CommandDispatcher.declareCommand(this, 'unregAfterRebuildHandler', function(handler) {
               var i = this._afterRebuildHandlers.indexOf(handler);
               // Если обработчик не найден, то херня какая-то, ругаемся
               if (i < 0) {
                  throw 'Event/BaseCard: Попытка удаления не зарегистрированного обработчика на afterRebuild';
               }

               this._afterRebuildHandlers.splice(i, 1);
               return true;
            });

            // Обновляем видимость блока "Материалы" в зависимости от кол-ва материалов
            CommandDispatcher.declareCommand(this, 'updateVisibleAttachments', function(attachments) {
               // Запоминаем прикрепленные материалы что бы учесть их при расчете видимости блока
               this._attachments = attachments;
               this.getLinkedContext().setValueSelf(
                  'blocksVisible/materials',
                  this._getMaterialsVisible(this.getRecord(), this.isEnabled(), this._options.isGuest),
                  this
               );
               return true;
            });
            //endregion
         },

         init: function() {
            BaseCard.superclass.init.apply(this, arguments);

            // Записываем права в контекст что бы можно было биндить на них опции
            this.getLinkedContext().setValueSelf('rights', this._options._rights);
            this._buildCtx(this._options.enabled);

            //region Init sub blocks
            this._initSocNetBlock();
            this._initOrganizers();
            this._initContacts();
            // Выступающие есть только в вебинаре
            if (+this._options.record.get('Type') === 2) {
               this._initSpeakers();
            }
            //endregion

            this._bindEvents();

            var eventInfo = this.getRecord().get('EventInfo');
            /**
             * Если не публичный лендинг и есть информация об анонсе, то помечяаем анонс как прочитанный.
             * Как говорят соц. сети просмотры у них поддреживаются только для аутентифицированных пользователей
             */
            if (!this._options.isGuest && eventInfo) {
               new SbisService({endpoint: 'Event'}).call('MarkAsRead', {
                  Id: eventInfo.get('Object'),
                  Event: eventInfo.get('Event'),
                  EventType: eventInfo.get('EventType')
               });
               new SbisService({endpoint: 'Event'}).call('GetEvent', {
                  Id: eventInfo.get('Event'),
                  Method: null
               });
            }

            // Биндим поля на контекст
            this._bindSubCtrlsPropsToCtx();
         },

         destroy: function() {
            BaseCard.superclass.destroy.apply(this);
            this._beforeSaveHandlers = [];
            this._beforeRebuildHandlers = [];
            this._afterRebuildHandlers = [];
            this._onChangeEditable = [];
            this._attachments = null;
            this._blocksVisible = null;
         },
         //endregion

         //region private
         _bindEvents: function() {
            var self = this;
            var updateBlocksVisibleTimeout;

            // Подписываемся на изменение кол-ва комментариев к анонсу, что бы обновить счетчик
            this.subscribeTo(ServerEventBus.serverChannel('news.CommentAdded'), 'onMessage', function(event, data) {
               var eventInfo = self.getRecord().get('EventInfo');
               if (eventInfo && eventInfo.get('Object') === data.get('GUID')) {
                  self.getLinkedContext().setValueSelf('blocksVisible/comments/count', data.get('numberComments'));
                  self._commentsCount = data.get('numberComments');
               }
            });

            // Подписываемся на изменение ответа пользователя на участие в вебинаре что бы обновить ответ в записи
            this.subscribeTo(ServerEventBus.serverChannel('meeting.onnextphase'), 'onMessage', function(event, data) {
               var eventRec = self.getRecord();
               if (eventRec.get('Id') === data.MeetUuid) {
                  eventRec.get('CurrentPhaseRS').set('Answer', eventsUtils.getAnswerByNamePassKey(data.Phase));
                  eventRec.acceptChanges(['CurrentPhaseRS']);
               }
            });

            // Подписываемся на изменение полей в записи чтобы одновить видимость блоков
            this.subscribeTo(this._options.record, 'onPropertyChange', function(event, props) {
               var properties = [
                  'State',
                  'AccessType',
                  'GuestPersonId',
                  'CurrentPhaseRS',
                  'TranslationState'
               ];

               for (var i = 0; i < properties.length; i++) {
                  if (properties[i] in props) {
                     clearTimeout(updateBlocksVisibleTimeout);
                     updateBlocksVisibleTimeout = setTimeout(function() {
                        self._updateBlocksVisible();
                        self._updateRights();
                     }, 100);
                     return;
                  }
               }
            });

            this.subscribeTo(this._options.record, 'onPropertyChange', function(event, props) {
               if (!props.Landing) {
                  return;
               }

               var banner = self.getRecord().getParsedLanding().banner;

               self.getContainer()
                  .toggleClass('events-BaseCard--big-header', banner.size === 'big')
                  .toggleClass('events-BaseCard--no-header', banner.size === null);
            });
         },

         /**
          * Биндим проперти дочерних контролов на поля записи
          * https://online.sbis.ru/open_dialog.html?guid=67c50208-bbec-455d-a880-37fdab469346
          */
         _bindSubCtrlsPropsToCtx: function() {
            var ctx = this.getLinkedContext();

            // Биндим поля вкладки участники на права и тип доступа
            this.waitChildControlByName('Participants').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'eventAccessType',
                     fieldName: 'record/AccessType'
                  }, {
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'published',
                     fieldName: 'record/published'
                  }, {
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'completed',
                     fieldName: 'record/completed'
                  }, {
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'permissions',
                     fieldName: 'rights/participants'
                  }]
               }).bindControl(ctrl, ctx, 'syncControl');
            });

            // Биндим поля блока регистрации
            this.waitChildControlByName('BaseCardRegForm').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: false,
                     propName: 'guestPersonId',
                     fieldName: 'record/GuestPersonId'
                  }]
               }).bindControl(ctrl, ctx, 'syncControl');
            });

            // Остальные поля есть смысл биндить только для режима редактирования
            if (this._options.isLanding || !this._options.allowChangeEnable) {
               return;
            }

            // Биндим поля рекорда на шапку
            this.waitChildControlByName('BaseCardHeader').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [
                     {
                        oneWay: false,
                        propName: 'cfg',
                        fieldName: 'record/Landing'
                     },
                     {
                        oneWay: false,
                        propName: 'subject',
                        fieldName: 'record/Name'
                     },
                     {
                        oneWay: false,
                        propName: 'shortDescr',
                        fieldName: 'record/ShortDescription'
                     },
                     {
                        oneWay: false,
                        propName: 'dateTimeStart',
                        fieldName: 'record/DateTimeStart'
                     },
                     {
                        oneWay: false,
                        propName: 'dateTimeEnd',
                        fieldName: 'record/DateTimeEnd'
                     }
                  ]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля рекорда на название события
            this.waitChildControlByName('BaseCardName').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: false,
                     propName: 'text',
                     fieldName: 'record/Name'
                  }]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля рекорда на описание события
            this.waitChildControlByName('BaseCardDescr').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: false,
                     propName: 'text',
                     fieldName: 'record/Description'
                  }]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля рекорда на периодичность
            this.waitChildControlByName('BaseCardPeriodicity').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: true,
                     propName: 'caption',
                     fieldName: 'record/repeatCaption',
                     direction: 'fromContext'
                  }, {
                     oneWay: false,
                     propName: 'periodicalSettings',
                     fieldName: 'record/PeriodicalMeeting'
                  }]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля рекорда на место проведения
            this.waitChildControlByName('BaseCardLocation').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: false,
                     propName: 'roomId',
                     fieldName: 'record/IdRoom'
                  }, {
                     oneWay: false,
                     propName: 'roomName',
                     fieldName: 'record/RoomName'
                  }, {
                     oneWay: false,
                     propName: 'address',
                     fieldName: 'record/Address'
                  }]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля рекорда на дату время начала и протоджительность
            this.waitChildControlByName('BaseCardDateInfo').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: false,
                     propName: 'dateTimeStart',
                     fieldName: 'record/DateTimeStart'
                  }, {
                     oneWay: false,
                     propName: 'dateTimeEnd',
                     fieldName: 'record/DateTimeEnd'
                  }, {
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'onlyDateStart',
                     fieldName: 'record/completed'
                  }]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля вкладки вопросов на права
            this.waitChildControlByName('Discussions').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'canAddQuestions',
                     fieldName: 'rights/canAddQuestions'
                  }]
               }).bindControl(ctrl, ctx);
            });

            // Биндим поля вкладки опросов на права
            this.waitChildControlByName('Interviews').addCallback(function(ctrl) {
               new ContextBinder({
                  bindings: [{
                     oneWay: true,
                     direction: 'fromContext',
                     propName: 'isAdmin',
                     fieldName: 'rights/canAddInterviews'
                  }]
               }).bindControl(ctrl, ctx);
            });
         },

         /**
          * Инициализируем данные контекста по опциям, уже после построения верстки
          */
         _switchBodyArea: function(areaId) {
            this.getChildControlByName('BodyAreas').setActiveArea(areaId);
         },

         _initSocNetBlock: function() {
            this.subscribeTo(this, 'onAfterLoad', function() {
               var commentsCreator = this.hasChildControlByName('CommentsCreator') ? this.getChildControlByName('CommentsCreator') : null,
                  comments = this.hasChildControlByName('CommentsList') ? this.getChildControlByName('CommentsList') : null;

               if (commentsCreator && comments && this._options.scrollToComments) {
                  setTimeout(function() {
                     comments
                        .getContainer()
                        .closest('.controls-ScrollContainer__content')
                        .animate({scrollTop: comments.getContainer().get(0).offsetTop}, 700);

                     commentsCreator.getChildControlByName('БогатыйРедакторСообщение').setActive(true);
                  }, 750);
               }
            }.bind(this));
         },

         _initSpeakers: function() {
            var self = this;

            this.waitChildControlByName('Speakers').addCallback(function(speakers) {
               // Перед сохранением основной записи провалидируем и сохраним выступающих
               self._beforeSaveHandlers.push(function() {
                  return speakers.save().addErrback(function(result) {
                     self.sendCommand('switchToMain');
                     return result;
                  });
               });

               // При переключении в режим просмотра надо удалить пустые итемы из списка выступающих
               self._onChangeEditable.push(function(editable) {
                  if (editable) {
                     return;
                  }

                  removeEmptyItems(self._options.record.get('Speakers'), 'Subscriber');
                  self._options.record.acceptChanges(['Speakers']);
               });
            });
         },

         _initContacts: function() {
            this.waitChildControlByName('Contacts').addCallback(function(contacts) {
               // При создании записи добавляем в контакты автора только в том случае, если записей там нет
               if (this._options.isNewRecord && !this._options.isCopy && !this.getRecord().get('Contacts').getCount()) {
                  var author = this._options.record.get('AuthorRS');
                  contacts.addContact(Record.fromObject({
                     'Лицо': author.get('Лицо'),
                     'Персона': author.get('Персона'),
                     'ФамилияИмя': (author.get('Фамилия') ? (author.get('Фамилия') + ' ') : '') + (author.get('Имя') || ''),
                     'Телефон': author.get('Телефон'),
                     'Должность': author.get('Должности') && author.get('Должности').getCount()
                        ? author.get('Должности').at(0).get('ДолжностьНазвание')
                        : null,
                     'Фото': author.get('Фото')
                  }, 'adapter.sbis'));
               }

               // Перед сохранением основной записи сохраним контакты
               this._beforeSaveHandlers.push(function() {
                  return contacts.save();
               });

               // При переключении в режим просмотра надо удалить пустые итемы из списка выступающих
               this._onChangeEditable.push(function(editable) {
                  if (editable) {
                     return;
                  }

                  removeEmptyItems(this._options.record.get('Contacts'), 'Персона');
                  this._options.record.acceptChanges(['Contacts']);
               }.bind(this));

               this.subscribeTo(contacts, 'onChange', this._markRecAsChanged.bind(this));
            }.bind(this));
         },

         _initOrganizers: function() {
            this.waitChildControlByName('BaseCardOrganizers').addCallback(function(organizrers) {
               var orgsRS = this._options.record.get('ClientOrganizerRS');

               /**
                * При создании новой записи (не копии) добавляем пустую запись с организатором елси в них нет еще ни
                * одной записи
                */
               if (this._options.isNewRecord && !this._options.isCopy && !orgsRS.getCount()) {
                  organizrers.addOrganizer();
               }

               this._onChangeEditable.push(function(editable) {
                  /**
                   * При переключении в режим просмотра удаляем пустые записи организаторов
                   */
                  if (!editable) {
                     removeEmptyItems(orgsRS, '@Лицо');
                     this._options.record.acceptChanges(['ClientOrganizerRS']);
                     return;
                  }

                  /**
                   * При переключении в режим редактирования если не задан ни один организатор, то добавляем пустую запись
                   */
                  if (!orgsRS.getCount()) {
                     organizrers.addOrganizer();
                     this._options.record.acceptChanges(['ClientOrganizerRS']);
                  }

               }.bind(this));
            }.bind(this));
         },

         _buildCtx: function(enabled) {
            var ctx = this.getLinkedContext();
            var eventRec = this.getRecord();

            ctx.setValueSelf({
               enabled: enabled,
               readonly: !enabled,
               rights: buildRights(eventRec, this._options)
            }, null, this);

            this._updateBlocksVisible(enabled);
         },

         _updateRights: function() {
            this.getLinkedContext().setValueSelf('rights', buildRights(this.getRecord(), this._options));
         },

         _updateBlocksVisible: function(enabled) {
            enabled = enabled === undefined ? this.isEnabled() : enabled;
            this.getLinkedContext().setValueSelf(
               'blocksVisible',
               this._getBlocksVisible(this.getRecord(), enabled, this._options.isGuest),
               null
            );
         },

         _getBlocksVisible: function(eventRec, enabled, isGuest) {
            var state = +eventRec.get('State');
            var accessType = eventRec.get('AccessType');
            var socNetInfo = eventRec.get('EventInfo');

            var isMember = eventRec.isCurrUserJoined() || eventRec.get('GuestPersonId');
            var isAdmin = eventRec.isCurrUserAdmin();

            return {
               // Видим описание если в режиме редактирования ИЛИ если ото задано
               description: enabled || !!eventRec.get('Description'),
               // Видим периодичность только в режиме редактирования
               periodicity: enabled,
               // Видим редактирование места проведения только если мы не физик
               locationEdit: enabled && UserInfo.get('КлассПользователя') !== '__сбис__физики',
               // Видим место проведения только в режим просмотра И если оно указоно И если его можно видеть
               locationView: !enabled && (!!eventRec.get('IdRoom') || !!eventRec.get('Address')) && canSeeBlock(eventRec.get('locationAccessSettings'), isMember, isAdmin),
               // Видим материалы в режиме редактирования ИЛИ (если разрешено их видеть И есть хотябы один материал)
               materials: this._getMaterialsVisible(eventRec, enabled, isGuest),
               comments: {
                  visible: !enabled && socNetInfo && eventRec.isPublished(),
                  count: this._commentsCount || (socNetInfo && socNetInfo.get('Counters').get('Comment')),
                  // если не закрытый И состояние не сохранени И не отменен
                  repost: accessType !== 2 && accessType !== 4 && state !== 0 && state !== 3,
                  // если в режиме просмотра И событие опубликовано И не отменено И (текущий пользователь участник ИЛИ событие без регистрации)
                  sender: !enabled && eventRec.isPublished() && !eventRec.isCanceled() && (isMember || accessType === 1)
               },
               // Видим участников в режиме редактирования ИЛИ если разрешено их видеть
               participants: enabled || canSeeBlock(eventRec.get('participantsAccessSettings'), isMember, isAdmin),
               // Видим организаторов в режиме редактирования ИЛИ (если разрешено их видеть И они есть)
               organizers: enabled || (
                  canSeeBlock(eventRec.get('organizersAccessSettings'), isMember, isAdmin) &&
                  (eventRec.get('ClientOrganizerRS') && !!eventRec.get('ClientOrganizerRS').getCount())
               ),
               // Видим контакты в режиме редактирования ИЛИ (если разрешено их видеть И они есть)
               contacts: enabled || (
                  canSeeBlock(eventRec.get('contactsAccessSettings'), isMember, isAdmin) &&
                  eventRec.get('Contacts') && eventRec.get('Contacts').getCount()
               ),
               // Видим вопросы в режиме редактирования ИЛИ если разрешено их видеть
               questions: enabled || (!isGuest && canSeeBlock(eventRec.get('questionsAccessSettings'), isMember, isAdmin)),
               // Видим опросы в режиме редактирования ИЛИ если разрешено их видеть
               interviews: this._getInterviewsVisible(eventRec, enabled, isGuest)
            };
         },

         /**
          * Видим материалы в режиме редактирования ИЛИ (если разрешено их видеть И есть хотябы один материал)
          */
         _getMaterialsVisible: function(eventRec, enabled, isGuest) {
            var isMember = eventRec.isCurrUserJoined();
            var isAdmin = eventRec.isCurrUserAdmin();

            return enabled || (!isGuest && (canSeeBlock(eventRec.get('materialsAccessSettings'), isMember, isAdmin) && this._attachments && !!this._attachments.getCount()));
         },

         /**
          * Настройка видимости опросов
          */
         _getInterviewsVisible: function(eventRec, enabled, isGuest) {
            if (enabled) {
               return true;
            }

            if (isGuest) {
               return false;
            }

            var isMember = eventRec.isCurrUserJoined();
            var isAdmin = eventRec.isCurrUserAdmin() || eventRec.isCurrUserModerator();
            var isCanSee = canSeeBlock(eventRec.get('quizAccessSettings'), isMember, isAdmin);

            if (isCanSee) {
               if (!isAdmin) {
                  return eventRec.get('Interviews').getCount();
               }

               return true;
            }

            return false;
         },

         //region After first publication
         /**
          * Вызывается визардом после первой публикации события
          */
         _afterFirstPublication: function() {
            this._updateSocNetCtrls();
         },

         /**
          * Подставляет данные по анонсу в блок комментариев и обновляет компоненты
          */
         _updateSocNetCtrls: function() {
            var
               webinarEmoji = this.getChildControlByName('Emoji'),
               commentsList = this.getChildControlByName('CommentsList'),
               commentsCreator = this.getChildControlByName('CommentsCreator'),
               eventInfo = this.getRecord().get('EventInfo'),
               webinarRepostButton;

            if (!eventInfo) {
               return;
            }

            // Блок лайков
            webinarEmoji.setId(eventInfo.get('Object'));

            if (this.hasChildControlByName('RepostButton')) {
               webinarRepostButton = this.getChildControlByName('RepostButton');
               // Кнопка репоста
               webinarRepostButton._options = cMerge(webinarRepostButton._options, {
                  channel: eventInfo.get('Channel'),
                  object: eventInfo.get('Object'),
                  event: eventInfo.get('Event'),
                  author: eventInfo.get('Author'),
                  count: eventInfo.get('Counters').get('Repost'),
                  opener: this
               });
               webinarRepostButton.rebuildMarkup();
            }

            // Список комментариев
            commentsList.changeNews(eventInfo.get('Object'), eventInfo.get('Author'), eventInfo.get('Channel'), this.getRecord().isCurrUserAdmin());

            // Отправка сообщений
            commentsCreator._options = cMerge(commentsCreator._options, {
               object: eventInfo.get('Object'),
               eventChannel: eventInfo.get('Channel')
            });
         },
         //endregion
         //endregion

         //region public
         setEnabled: function(value) {
            BaseCard.superclass.setEnabled.apply(this, arguments);
            this._onChangeEditable.forEach(function(cb) {
               cb.call(this, value);
            });
            this._buildCtx(value);
         },

         /**
          * Возвращает массив обработчиков, которые должны быть вызваны перед сохраненим записи.
          * Отдает ссылку на свой внутренний массив.
          */
         getBeforeSaveHandlers: function() {
            return this._beforeSaveHandlers;
         },

         /**
          * Возвращает массив обработчиков, которые должны быть вызваны перед ребилдом карточки при смене шаблона лендинга.
          * Отдает ссылку на свой внутренний массив.
          */
         getBeforeRebuildHandlers: function() {
            return this._beforeRebuildHandlers;
         },

         /**
          * Возвращает массив обработчиков, которые должны быть вызваны после ребилда карточки при смене шаблона лендинга.
          * Отдает ссылку на свой внутренний массив.
          */
         getAfterRebuildHandlers: function() {
            return this._afterRebuildHandlers;
         },

         getRecord: function() {
            return this._options.record;
         },
         
         setRecord: function(rec) {
            this._options.record = rec;
            this.getLinkedContext().setValueSelf('record', rec, this);
         },

         setHeaderRightMargin: function(value) {
            this._options.headerRightMargin = value;
            if (this.hasChildControlByName('BaseCardHeader')) {
               this.getChildControlByName('BaseCardHeader').setRightMargin(value);
            }
         },
         //endregion

         _markRecAsChanged: function() {
            var rec = this.getRecord();

            if (rec.getFormat().getFieldIndex('hasChange') === -1) {
               rec.addField({name: 'hasChange', type: 'string'});
            }
            this.getRecord().set('hasChange', new Date().toLocaleDateString());
         }
      });

      /**
       * Инициализирует данные новой записи значениями по умолчанию
       */
      function initCreationData(ops) {
         if (!ops.isNewRecord || ops.isCopy) {
            return;
         }

         //region Если в контактах пусто, то вставим туда пустой RecordSet
         if (!ops.record.get('Contacts')) {
            ops.record.set('Contacts', new RecordSet({
               adapter: 'adapter.sbis',
               idProperty: 'Персона',
               format: {
                  'Лицо': 'integer',
                  'Персона': 'string',
                  'ФамилияИмя': 'string',
                  'Телефон': 'string',
                  'Должность': 'string',
                  'Фото': 'string',
                  'Контакты': 'recordset'
               }
            }));
            ops.record.acceptChanges(['Contacts']);
         }
         //endregion

         //region Если в организаторах пусто, то вставим туда пустой RecordSet
         if (!ops.record.get('ClientOrganizerRS')) {
            ops.record.set('ClientOrganizerRS', new RecordSet({
               adapter: 'adapter.sbis',
               idProperty: '@Лицо',
               format: {
                  '@Лицо': 'integer',
                  'ИдентификаторСПП': 'integer',
                  'Название': 'string',
                  'Регион': 'string',
                  'Фото': 'boolean',
                  'ЮрАдрес': 'string'
               }
            }));
            ops.record.acceptChanges(['ClientOrganizerRS']);
         }

         if (!ops.record.get('ClientOrganizer')) {
            ops.record.set('ClientOrganizer', []);
            ops.record.acceptChanges(['ClientOrganizer']);
         }
         //endregion
      }

      /**
       * Удаляет пустые записи из переданного RecordSet. Для проверки на пустой итем берет значение поля checkField, если
       * значение в этом поле возвращает false или то что конвертируется в false, то такая запись будет удалена
       */
      function removeEmptyItems(recSet, checkField) {
         var forDelete = [];
         recSet.each(function(rec) {
            if (!rec.get(checkField)) {
               forDelete.push(rec);
            }
         });

         forDelete.forEach(function(rec) {
            recSet.remove(rec);
         });
      }

      function canSeeBlock(blockAccessSettings, isMember, isAdmin) {
         return blockAccessSettings.denied === null && (
            (blockAccessSettings.visibility === 'participants' && (isMember || isAdmin)) ||
            (blockAccessSettings.visibility === 'admins' && isAdmin) ||
            (blockAccessSettings.visibility === 'all' || blockAccessSettings.visibility === undefined)
         );
      }

      function canAddBlock(blockAccessSettings, isMember, isAdmin) {
         return blockAccessSettings.denied === null && (
            (blockAccessSettings.can_add === 'participants' && (isMember || isAdmin)) ||
            (blockAccessSettings.can_add === 'admins' && isAdmin) ||
            (blockAccessSettings.can_add === 'all' || blockAccessSettings.can_add === undefined)
         );
      }

      //region rights
      function buildRights(event, options) {
         var
            isPublicLanding = options.isGuest,
            isAdmin = event.isCurrUserAdmin(),
            isAuthor = event.isCurrUserAuthor(),
            isSpeaker = event.isCurrUserSpeaker(),
            isModerator = event.isCurrUserModerator(),
            isJoined = event.isCurrUserJoined(),
            isCompleted = event.isCompleted(),
            isCanceled = event.isCanceled(),
            isPublished = event.isPublished(),
            isWebinar = +event.get('Type') === 2,
            isWithoutReg = event.get('AccessType') === eventsBaseCardUtils.consts.ACCESS_TYPE.WITHOUT_REG;

         return {
            isAdmin: isAdmin,
            canAddComments: (isPublished && !!event.get('EventInfo') && !isCanceled) && (isJoined || isWithoutReg),
            canAddInterviews: isAdmin,
            canAddQuestions: isAdmin || canAddBlock(event.get('questionsAccessSettings'), isJoined, isAdmin),
            participants: {
               canUserAdd: (isAdmin || !isPublicLanding && !isCompleted && canAddBlock(event.get('participantsAccessSettings'), isJoined, isAdmin)),
               canUserDelete: isAdmin || isModerator,
               canUserMove: isAdmin && !isCompleted,
               canFolderAdd: isAdmin && !isCompleted,
               canFolderEdit: isAdmin && !isCompleted,
               canFolderDelete: isAdmin && !isCompleted,
               canAddModerator: (isAuthor || isSpeaker) && !isCompleted,
               canAddSpeaker: isWebinar && (isAuthor || isModerator) && !isPublished,
               canBanUser: isAuthor || isModerator,
               canExport: (isAuthor || isSpeaker) && isCompleted
            }
         };
      }
      //endregion

      return BaseCard;
   }
);
