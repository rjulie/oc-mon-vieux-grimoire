const Book = require('../models/Book');
const fs = require('fs');

exports.createBook = (req, res, next) => {
  const bookOject = JSON.parse(req.body.book);
  delete bookOject._id;
  delete bookOject._userId;
  const book = new Book({
    ...bookOject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  book.save()
  .then(() => { res.status(201).json({message: 'Objet enregistré !'})})
  .catch(error => { res.status(400).json( { error })})
};


exports.createRating = (req, res, next) => {
  const user = req.body.userId;

  if (user != req.auth.userId) {
    res.status(401).json({ message : 'Not authorized'});
  }

  Book.findOne({_id: req.params.id})
    .then((book) => {
      console.log("book", book);
      if (book.ratings.some(rating => rating.userId === req.auth.userId) ) {
        res.status(500).json({ error: 'Rating not authorized. User had already asigned a grade.' });
      }

      if (req.body.grade < 1 || req.body.grade > 5) {
        res.status(500).json({ error: 'Rating not authorized. Grade must be included between 1 and 5' });
      }

      const newRating = { userId: req.auth.userId, grade: req.body.rating};
      book.ratings.push(newRating);

      const numberOfRatings = book.ratings.length;
      const sumOfRatings = book.ratings.reduce((acc, rating) => acc + rating.grade, 0);
      book.averageRating = sumOfRatings / numberOfRatings;

      book.save()
      .then(book => {
          res.status(200).json(book);
      })
      .catch(error => res.status(500).json({ error }));

    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};


exports.modifyBook = (req, res, next) => {
  const bookObject = req.file ? {
    ...JSON.parse(req.body.book),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete bookObject._userId;
  Book.findOne({_id: req.params.id})
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message : 'Not authorized'});
      } else {
        Book.updateOne({ _id: req.params.id}, { ...bookObject, _id: req.params.id})
        .then(() => res.status(200).json({message : 'Objet modifié!'}))
        .catch(error => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
  .then(book => {
    if (book.userId != req.auth.userId) {
      res.status(401).json({message: 'Not authorized'});
    } else {
      const filename = book.imageUrl.split('/images/')[1];
      fs.unlink(`images/${filename}`, () => {
        Book.deleteOne({_id: req.params.id})
          .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
          .catch(error => res.status(401).json({ error }));
      });
    }
  })
  .catch( error => {
    res.status(500).json({ error });
  });
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
  .then(books => res.status(200).json(books))
  .catch(error => res.status(400).json({ error }));
};

exports.getBestrating = (req, res, next) => {
  Book.find()
    .sort({averageRating: -1})
    .limit(3)
  .then(books => res.status(200).json(books))
  .catch(error => res.status(400).json({ error }));
};
