//______________всякие модули_____________________________________________________
const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true}); //создаем датабазу

const day = date.getDate();
//_________схемы и модели_______________________________________________________________________________

//создали схему и модель для создания итемов в листе
const itemsSchema = {name:String};  //schema для создания item
const Item = mongoose.model("Item", itemsSchema); //model для создания коллекции items

//создали default документы и массив
const item1 = new Item ({name:"Buy Food"});
const item2 = new Item ({name:"Prepare Food"});
const item3 = new Item ({name:"Eat Food"});
const defaultItems = [item1, item2, item3,];

const listSchema = {      //схема по которой будут создаваться новые листы.
  name:String,
  items:[itemsSchema],
  link:String
};
const List = mongoose.model("List", listSchema); //модель для создания коллекций. List - имя модели. "List" - одиночная форма. lists - будет название коллекции

//__________стартовая страница______________________________________________________________________________
//на гет реквест домашняя страничка отвечает поиском итемов в коллекции итемс.
app.get("/", function(req, res) {

  Item.find({}, function(err, itemsFound){   //find({}) - работает как отобразить всё. Внутри должны быть условия, но нам нужно всё - потому пусто. itemsFound -можно назвать как угодною. Это результаты поиска.
    if(itemsFound.length === 0){
      //загружаем массив в коллекцию датабазы
      Item.insertMany(defaultItems, function(err){
        if(err){
          console.log(err);
        }else{
          console.log("successfully added");
        }
      });
      res.redirect("/");//если итемов нет, то они будут добавлены методом insertMany(), но не отобразятся на странице потому что нету render().
      //Поэтому редирект, перенаправит юзера на хоумпейдж повторно. Но итемы уже есть, потому сработает else, которое рендерит страницу.
    } else{
      res.render("list",{listTitle: day, newListItems: itemsFound});
    }
  });
});
//____________две предопределенные страницы____________________________________________________________________________

app.get("/views/ListsAll", function(req, res){

  List.find({}, function(err, results){
    if(!err){
      res.render("listsAll", {newListItems:results});
    } else{
      console.log("errors");
    }
    });
});


app.get("/views/About", function(req, res){
  res.render("about");
});

//_______________добавление итемов в списки на главную и не только____________________________________________________________

app.post("/", function(req, res){
  const itemName = req.body.newItem;  //получает имя из инпут хтмл дока
  const listName = req.body.list; //list - имя кнопки в list.ejs
  const item = new Item({name: itemName});//новый итем получает имя полученное из инпут хтмл дока

    if(listName === day){
      item.save();
      res.redirect("/");
  } else {
    List.findOne({name:listName},function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/"+ listName);
    });
  }
});

//__________________________можно удалять итемы из списков_______________________________________________________________________
app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listNameD = req.body.listToDeleteName;  //listToDeleteName - в list.ejs

 //можно удалять из списка на главной
  if(listNameD === day){
    Item.findByIdAndRemove(checkedItemId, function(err){   //методу обязательно нужен коллбэк, чтобы он удалил итем. Иначе он просто находит итем по ид.
      if(!err){
        console.log("item deleted successfully");
        res.redirect("/");  //redirect() - чтобы было видно, что итем удалён.
      }
    });
  //можно удалять из других
  } else{
    List.findOneAndUpdate({
      //conditions
      name: listNameD   //находим тот лист, в котором будем удалять
    },{//update
      $pull:{items:{_id:checkedItemId}}    //$pull - удаляет элемент из массива items элемент с _id того элемента где клацнули чекбокс
    },//callback function(err,results)
    function(err, foundListD){  //foundListD - можно как угодно назвать
      if(!err){
        res.redirect("/"+listNameD);
      }
    });
  }
});

//________________________создание новых списков______________________________________________________________________________________________________________
app.get("/:customListName", function(req, res){     //делаем чтобы юзер мог "создавать" листы вписывая их название как линк

  const userTypeThis = _.capitalize(req.params.customListName); // делаем переменную и _.capitalize, чтобы первая буква была большой

  List.findOne({name:userTypeThis},function(err, resultOfSearch){ //findOne() -метод которым мы ищем один объект.
      if(!err){
          if(!resultOfSearch){
            //creating new list
            const list = new List({
              name: userTypeThis,
              items: defaultItems,
              link: "/"+userTypeThis
            });
            list.save();
            res.redirect("/"+userTypeThis);
          } else{
            //showing the previously created list
            res.render("list", {listTitle: resultOfSearch.name, newListItems: resultOfSearch.items});
            console.log("Exists!");
          }
      } else{
        console.log(err);
      }
  });
});


//_______________________________________________________________________________________________________________________
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
