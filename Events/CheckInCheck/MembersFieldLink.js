define(
   'Events/CheckInCheck/MembersFieldLink',
   [
      'SBIS3.CONTROLS/FieldLink',
      'WS.Data/Source/SbisService',
      'SBIS3.CONTROLS/DataGridView'
   ],
   function (
      FieldLink,
      SbisService,
   ) {
      'use strict';

      var dataSource = new SbisService({
         idProperty: 'Subscriber',
         endpoint: 'Subscriber',
         binding: {
            query: 'GetMembers',
         },
      });

      var CheckWidget = FieldLink.extend({
         // _dotTplFn: template,
         $protected: {
            _options: {
               name: 'showAllButtonField',
               class: 'docs-ShowAllButton2',
               placeholder: 'Введите имя сотрудника',
               displayProperty: 'SubscriberName',
               searchParam: 'SubscriberSearch',
               startCharacter: '3',
               multiselect: true,
               idProperty: 'Subscriber',
               chooserMode: 'dialog',
               list: {
                  component: 'SBIS3.CONTROLS/DataGridView',
                  options: {
                     itemsActions: '',
                     idProperty: 'Subscriber',
                     pageSize: '5',
                     showHead: true,
                     columns: [
                        {field: 'SubscriberName', title: 'Имя', width: 66},
                        {field: 'SubscriberSurname', title: 'Фамилия', width: 66},
                     ],
                     dataSource: dataSource,
                     filter: {
                        FioFormat: true,
                        Inheritance: true,
                     },
                  },
               },
            },
         },

         _modifyOptions: function () {
            var ops = CheckWidget.superclass._modifyOptions.apply(this, arguments);
            ops.list.options.filter.Channel = ops.eventId;
            return ops;
         }
      });

      return CheckWidget;
   },
);
