const navSlide = () => {
    const menuBox = document.querySelector('.menubox')
    const menu = document.querySelector('.menu');
    //main div container for the menu icons
    const navList = document.querySelector('.nav-list');
    //ul class
   

    menuBox.addEventListener('click', () => {

        //toggle Nav
        navList.classList.toggle('nav-active');
    

        //menu animation
        menu.classList.toggle('toggle');



        
    });
 


}


const showInfo = () => {
const showHide = document.querySelector('.toggle-btn');
const projectInfo = document.querySelector('.about-project');
const closeInfo = document.querySelector('.hide-btn');

showHide.addEventListener('click', () => {

        projectInfo.classList.toggle('project-open');
       

        

});

closeInfo.addEventListener('click', () => {

    projectInfo.classList.remove('project-open');
   

});


}

navSlide();
showInfo();
closeInfo();